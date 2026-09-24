import dgram from 'node:dgram'
import decoder from './decoder.js'
import encoder from './encoder.js'
import { decoded as responseFixture } from './fixtures/pi-world-a/02-aa-answer.js'

const server = dgram.createSocket('udp4')

server.on('error', (err) => {
  console.error(`server error:\n${err.stack}`)
  server.close()
})

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`)
  const decoded = decoder(msg)
  const transactionId = decoded.header.transactionId

  const fixtureWithCorrectTransactionId = {
    ...responseFixture,
    header: {
      ...responseFixture.header,
      transactionId,
    },
  }

  const response = encoder(fixtureWithCorrectTransactionId)

  server.send(response, rinfo.port, rinfo.address)
})

server.on('listening', () => {
  const address = server.address()
  console.log(`server listening ${address.address}:${address.port}`)
})

server.bind(53)
