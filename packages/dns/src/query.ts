import dgram from 'node:dgram'
import rootNameServers from './config/root-name-servers.js'
import decodeDnsMessage from './decoder.js'
import encodeDnsMessage from './encoder.js'
import { query } from './fixtures/google-com-a/query.js'

const uscRootNameServer = rootNameServers.find(({ operator }) =>
  operator.includes('University of Southern California'),
)
const PORT = 53

const socket = dgram.createSocket('udp4')

socket.on('connect', (...args) => {
  console.log(`Connected to UDP socket. ${JSON.stringify(args)}`)
})

socket.on('close', (...args) => {
  console.log(`UDP socket closed. ${JSON.stringify(args)}`)
})

socket.on('error', (...args) => {
  console.log(`UDP socket connection error. ${JSON.stringify(args)}`)
})

socket.on('message', (msg, rinfo) => {
  const decoded = decodeDnsMessage(msg)
  console.log(JSON.stringify({ decoded, rinfo }))
  process.exit(0)
})

const sendMessage = (message: Buffer) => {
  console.log('Sending message', message)
  socket.send(message, PORT, uscRootNameServer?.ip.v4)
}

const message = encodeDnsMessage(query({ rd: 0 }))
sendMessage(message)
