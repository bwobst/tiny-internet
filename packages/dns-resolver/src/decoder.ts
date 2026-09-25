import type { DnsHeader, DnsQuery, DnsQuestion } from '@dns-resolver/interfaces.js'

// word - flag
// shift - number of bits that sit to the right of the word
// width - number of bits that represent the word
const bits = (word: number, shift: number, width: number) =>
  (word >> shift) & ((1 << width) - 1)

const decodeFlags = (
  flagUdpPayload: Buffer<ArrayBuffer>,
): DnsHeader['flags'] => {
  const flags = flagUdpPayload.readUInt16BE()

  return {
    qr: bits(flags, 15, 1), // query/response
    opcode: bits(flags, 11, 4), // opcode
    aa: bits(flags, 10, 1), // authoritative answer
    tc: bits(flags, 9, 1), // truncated
    rd: bits(flags, 8, 1), // recursion desired
    ra: bits(flags, 7, 1), // recursion available
    rcode: bits(flags, 0, 4), // reply code
  }
}

export const decodeHeader = (
  headerUdpPayload: Buffer<ArrayBuffer>,
): DnsHeader => {
  return {
    transactionId: headerUdpPayload.readUInt16BE(0),
    flags: decodeFlags(headerUdpPayload.subarray(2, 4)),
    qdcount: headerUdpPayload.readUInt16BE(4),
    ancount: headerUdpPayload.readUInt16BE(6),
    nscount: headerUdpPayload.readUInt16BE(8),
    arcount: headerUdpPayload.readUInt16BE(10),
  }
}

// TODO: Only supports decoding one question
export const decodeQuestions = (
  questionsUdpPayload: Buffer<ArrayBuffer>,
): DnsQuestion[] => {
  // Overall result
  const results = []

  // Per-iteration variables. Doesn't currently get cleared out per iteration.
  const labels = []
  let index = 0
  let type: number
  let clss: number

  do {
    // Found null byte for label
    if (questionsUdpPayload.readUInt16BE(index) === 0x00) {
      type = questionsUdpPayload.readUInt16BE(index + 1)
      clss = questionsUdpPayload.readUInt16BE(index + 3)

      results.push({
        name: labels.join('.'),
        type,
        class: clss,
      })

      break
    }

    const length = questionsUdpPayload.readUIntBE(index, 1)

    const value = questionsUdpPayload.toString(
      'utf8',
      index + 1,
      index + length + 1,
    )

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
