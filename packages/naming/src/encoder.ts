import type {
  DnsHeader,
  DnsQuestion,
  DnsResourceRecord,
  DnsResponse,
} from './interfaces.js'

const prettyPrintResult = (result: Buffer<ArrayBuffer>) => {
  const hex = result.toString('hex')
  console.log(`========== ${result.length} bytes ==========`) // eslint-disable-line
  for (let offset = 0; offset < result.length; offset += 16) {
    const pairs = hex.slice(offset * 2, (offset + 16) * 2).match(/../g) ?? []
    const left = pairs.slice(0, 8).join(' ')
    const right = pairs.slice(8).join(' ')
    console.log(offset.toString(16).padStart(4, '0'), left, right) // eslint-disable-line
  }
}

const encodeTransactionId = (transactionId: number): Buffer<ArrayBuffer> => {
  // Allocate two bytes and write the manually constructed 16-bit flag value into it
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16BE(transactionId)
  return buffer
}

const encodeFlags = (
  responseFlags: DnsHeader['flags'],
): Buffer<ArrayBuffer> => {
  let result = 0

  result |= responseFlags.qr << 15
  result |= responseFlags.opcode << 11
  result |= responseFlags.aa << 10
  result |= responseFlags.tc << 9
  result |= responseFlags.rd << 8
  result |= responseFlags.ra << 7
  result |= responseFlags.rcode << 3

  // Allocate two bytes and write the manually constructed 16-bit flag value into it
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16BE(result)
  return buffer
}

const encodeCount = (count: number): Buffer<ArrayBuffer> => {
  // Allocate 2 bytes and write the manually constructed 16-bit flag value into it
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16BE(count)
  return buffer
}

export const encodeHeader = (
  responseHeader: DnsHeader,
): Buffer<ArrayBuffer> => {
  return Buffer.concat([
    encodeTransactionId(responseHeader.transactionId),
    encodeFlags(responseHeader.flags),
    encodeCount(responseHeader.qdcount),
    encodeCount(responseHeader.ancount),
    encodeCount(responseHeader.nscount),
    encodeCount(responseHeader.arcount),
  ])
}

const encode16BitNumber = (num: number): Buffer<ArrayBuffer> => {
  // Allocate two bytes and write to it
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16BE(num)
  return buffer
}

const encode32BitNumber = (num: number): Buffer<ArrayBuffer> => {
  // Allocate four bytes and write to it
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(num)
  return buffer
}

export const encodeQuestions = (
  responseQuestions: DnsQuestion[],
): Buffer<ArrayBuffer> => {
  const question = responseQuestions[0]
  if (!question) throw new Error('No question to encode')

  const result = Buffer.concat([
    Buffer.concat(
      question.name.split('.').map((label) => {
        const length = label.length
        const lengthBuff = Buffer.from([length])
        return Buffer.concat([
          lengthBuff,
          Buffer.from(label, 'utf8'), // label
        ])
      }),
    ),
    Buffer.from([0x00]), // null byte to indicate the end of the label
    encode16BitNumber(1), // type
    encode16BitNumber(1), // class
  ])

  return result
}

export const encodeAnswers = (
  answers: DnsResourceRecord[],
): Buffer<ArrayBuffer> => {
  return Buffer.concat(
    answers.map((answer) => {
      let name = 0

      // `1100 0000` indicates the answer is a pointer, not label
      name |= 1 << 15
      name |= 1 << 14

      // `0000 1100` = 12 which indicates the byte that starts the question name
      // We hardcode `12` because the header is always 12 bytes long and we only support one question
      name |= 12

      // Allocate two bytes and write the manually constructed 16-bit flag value into it
      const nameBuff = Buffer.alloc(2)
      nameBuff.writeUInt16BE(name)

      const result = Buffer.concat([
        nameBuff,
        encode16BitNumber(answer.type), // type
        encode16BitNumber(answer.class), // class
        encode32BitNumber(answer.ttl), // ttl
        encode16BitNumber(answer.rdlength), // rdlength
        answer.rdata,
      ])

      return result
    }),
  )
}

const encoder = (response: DnsResponse): Buffer<ArrayBuffer> => {
  const result = Buffer.concat([
    encodeHeader(response.header),
    encodeQuestions(response.questions),
    encodeAnswers(response.answers),
  ])

  prettyPrintResult(result)

  return result
}

export default encoder
