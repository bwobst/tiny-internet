import dgram from 'node:dgram'
import decoder from './decoder.js'
import encoder from './encoder.js'
import type { DnsResponse } from './interfaces.js'

const ANSWERS = [
  {
    name: 'pi.world',
    type: 1,
    class: 1,
    ttl: 300,
    rdlength: 4,
    rdata: Buffer.from([10, 53, 0, 10]),
  },
  {
    name: 'pi.world',
    type: 1,
    class: 1,
    ttl: 300,
    rdlength: 4,
    rdata: Buffer.from([10, 53, 0, 11]),
  },
  {
    name: 'pi.world',
    type: 1,
    class: 1,
    ttl: 300,
    rdlength: 4,
    rdata: Buffer.from([10, 53, 0, 12]),
  },
  {
    name: 'alpha.pi.world',
    type: 1,
    class: 1,
    ttl: 300,
    rdlength: 4,
    rdata: Buffer.from([10, 53, 0, 10]),
  },
  {
    name: 'bravo.pi.world',
    type: 1,
    class: 1,
    ttl: 300,
    rdlength: 4,
    rdata: Buffer.from([10, 53, 0, 11]),
  },
  {
    name: 'charlie.pi.world',
    type: 1,
    class: 1,
    ttl: 300,
    rdlength: 4,
    rdata: Buffer.from([10, 53, 0, 12]),
  },
]

// Return code
// 0 = No error; successful update (NOERROR)
// 3 = A name that should exist does not exist (NXDOMAIN)
// 5 = DNS server refuses to perform the update (REFUSED)
const determineRCode = (questionName: string, answersLength: number) => {
  if (questionName.split('.').pop() !== 'world') return 5
  if (answersLength === 0) return 3

  return 0
}

const server = dgram.createSocket('udp4')

server.on('error', (err) => {
  console.error(`server error:\n${err.stack}`)
  server.close()
})

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`)
  const decoded = decoder(msg)

  // console.log('========== decoded ==========') // eslint-disable-line
  // console.log(decoded)
  // console.log('========== /decoded ==========') // eslint-disable-line

  const question = decoded.questions[0]

  if (!question) throw new Error('No question provided')

  const answers = ANSWERS.filter(
    (answer) => decoded.questions[0]!.name === answer.name,
  )

  const rcode = determineRCode(question.name, answers.length)

  const response: DnsResponse = {
    header: {
      ...decoded.header,
      flags: {
        ...decoded.header.flags,
        qr: 1,
        aa: rcode === 0 ? 1 : decoded.header.flags.aa,
        rcode,
      },
      ancount: answers.length,
      arcount: 0,
    },
    questions: decoded.questions,
    answers,
  }

  console.log('========== response ==========') // eslint-disable-line
  console.log(response)
  console.log('========== /response ==========') // eslint-disable-line

  server.send(encoder(response), rinfo.port, rinfo.address)
})

server.on('listening', () => {
  const address = server.address()
  console.log(`server listening ${address.address}:${address.port}`)
})

server.bind(53)
