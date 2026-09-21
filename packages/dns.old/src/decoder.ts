import { uint16ToDec } from './byte-view.js'
import {
  type DnsMessageResponse,
  HEADER_LENGTH,
  type ResourceRecord,
} from './interfaces.js'

/**
 * Terminology:
 * - Buffer / subarray → bytes on the wire
 * - readUInt16BE() result → a uint16 or 16-bit field
 * - & / >> in comments → bits (which positions you keep or drop)
 */

/**
 * Example input: [0xaa, 0xaa]
 * Example output: 0xaaaa
 */
const decodeTransactionId = (buffer: Buffer) => {
  return `0x${buffer.toString('hex')}`
}

/**
 * Example input: [0x81, 0x80]
 * Example output: 10000001 10000000
 */
const decodeFlags = (buffer: Buffer) => {
  const flags = buffer.readUInt16BE()

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

const parseIntFromBuff = (buffer: Buffer) => {
  return parseInt(buffer.toString('hex'), 16)
}

const decodeHeader = (buffer: Buffer) => {
  return {
    transactionId: decodeTransactionId(buffer.subarray(0, 2)),
    flags: decodeFlags(buffer.subarray(2, 4)),
    qdcount: parseIntFromBuff(buffer.subarray(4, 6)),
    ancount: parseIntFromBuff(buffer.subarray(6, 8)),
    nscount: parseIntFromBuff(buffer.subarray(8, 10)),
    arcount: parseIntFromBuff(buffer.subarray(10, 12)),
  }
}

const decodeQuestions = (buffer: Buffer) => {
  const MAX_ITERATIONS = 10
  let iteration = 0

  let index = 0
  let length = 0
  const labels: string[] = []
  let totalLength = 4 // Two octets: one for type and one for class

  do {
    iteration++

    if (iteration > MAX_ITERATIONS) {
      console.error('Reached max iterations. Bailing out.')
      break
    }

    length = parseIntFromBuff(buffer.subarray(index, index + 1))
    totalLength += length + 1 // +1 to account for length-prefix for each label

    const label = buffer
      .subarray(index + 1, index + length + 1)
      .toString('utf8')
    labels.push(label)

    index += length + 1
  } while (length > 0)

  return {
    name: labels.filter(Boolean).join('.'),
    type: parseIntFromBuff(buffer.subarray(index, index + 2)),
    class: parseIntFromBuff(buffer.subarray(index + 2, index + 4)),
    totalLength,
  }
}

const decodeResourceRecord = (
  buffer: Buffer,
  fullBuffer: Buffer,
): ResourceRecord => {
  // Name pointer is indicated by the top two bits being `11`.
  const namePointerBytes = buffer.subarray(0, 2).readUInt16BE()
  const isNamePointer = namePointerBytes >> 14 === 0b11
  // console.log('isNamePointer', isNamePointer)

  // 0x3fff = [0x3f, 0xff] = 00111111 11111111
  const bitMask = 0x3fff

  const namePointerOffset = parseInt(
    uint16ToDec(namePointerBytes & bitMask),
    10,
  )

  const decodedQuestionByOffset = decodeQuestions(
    fullBuffer.subarray(namePointerOffset),
  )

  const rdlength = parseIntFromBuff(buffer.subarray(10, 12))

  return {
    name: decodedQuestionByOffset.name,
    type: parseIntFromBuff(buffer.subarray(2, 4)),
    class: parseIntFromBuff(buffer.subarray(4, 6)),
    ttl: parseIntFromBuff(buffer.subarray(6, 10)),
    rdlength,
    rdata: buffer.subarray(12, 12 + rdlength),
  }
}

const decodeDnsMessage = (buffer: Buffer): DnsMessageResponse => {
  const questions = decodeQuestions(buffer.subarray(HEADER_LENGTH))

  const result: DnsMessageResponse = {
    header: decodeHeader(buffer),
  }

  // On an invalid response, only the header is returned so only parse that
  if (buffer.length === HEADER_LENGTH) return result

  result.questions = questions

  result.answers = [
    decodeResourceRecord(
      buffer.subarray(HEADER_LENGTH + questions.totalLength),
      buffer,
    ),
  ]

  if (result.header.nscount > 0) {
    result.authority = [
      decodeResourceRecord(
        buffer.subarray(HEADER_LENGTH + questions.totalLength),
        buffer,
      ),
    ]
  }

  if (result.header.arcount > 0) {
    result.additional = [
      decodeResourceRecord(
        buffer.subarray(HEADER_LENGTH + questions.totalLength),
        buffer,
      ),
    ]
  }

  return result
}

export default decodeDnsMessage
