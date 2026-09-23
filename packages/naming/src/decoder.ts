import type { DnsHeader, DnsQuery, DnsQuestion } from '@naming/interfaces.js'

const decodeFlags = (
  flagUdpPayload: Buffer<ArrayBuffer>,
): DnsHeader['flags'] => {
  const flags = flagUdpPayload.readUInt16BE()

  return {
    qr: (flags >> 15) & 0b1, // query/response
    opcode: (flags >> 11) & 0b1111, // opcode
    aa: (flags >> 10) & 0b1, // authoritative answer
    tc: (flags >> 9) & 0b1, // truncated
    rd: (flags >> 8) & 0b1, // recursion desired
    ra: (flags >> 7) & 0b1, // recursion available
    rcode: (flags >> 3) & 0b1111, // reply code
  }
}

const decodeHeader = (headerUdpPayload: Buffer<ArrayBuffer>): DnsHeader => {
  return {
    transactionId: headerUdpPayload.readUInt16BE(0),
    flags: decodeFlags(headerUdpPayload.subarray(2, 4)),
    qdcount: headerUdpPayload.readUInt16BE(4),
    ancount: headerUdpPayload.readUInt16BE(6),
    nscount: headerUdpPayload.readUInt16BE(8),
    arcount: headerUdpPayload.readUInt16BE(10),
  }
}

const convertBuffToInt = (buffer: Buffer<ArrayBuffer>): number => {
  return parseInt(buffer.toString('hex'), 10)
}

// TODO: Only supports decoding one question
const decodeQuestions = (
  questionsUdpPayload: Buffer<ArrayBuffer>,
): DnsQuestion[] => {
  const TYPE_LENGTH = 2
  const CLSS_LENGTH = 2
  const results = []
  const labels = []
  let index = 0
  let type: number
  let clss: number

  do {
    // Found null byte for label
    if (
      convertBuffToInt(questionsUdpPayload.subarray(index, index + 1)) === 0x00
    ) {
      type = convertBuffToInt(
        questionsUdpPayload.subarray(index + 1, index + 1 + TYPE_LENGTH),
      )
      clss = convertBuffToInt(
        questionsUdpPayload.subarray(
          index + 3,
          index + 1 + TYPE_LENGTH + CLSS_LENGTH,
        ),
      )

      results.push({
        name: labels.join('.'),
        type,
        class: clss,
      })

      break
    }

    const length = convertBuffToInt(
      questionsUdpPayload.subarray(index, index + 1),
    )

    const value = questionsUdpPayload
      .subarray(index + 1, index + length + 1)
      .toString('utf8')

    labels.push(value)

    index += length + 1
  } while (index < questionsUdpPayload.length - 1)

  return results
}

const decoder = (udpPayload: Buffer<ArrayBuffer>): DnsQuery => {
  return {
    header: decodeHeader(udpPayload.subarray(0, 12)),
    questions: decodeQuestions(udpPayload.subarray(12)),
  }
}

export default decoder
