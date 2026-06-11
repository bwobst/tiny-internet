import type { DnsMessageResponse } from '@dns/interfaces.js'

/**
 * Response to 00-query from 8.8.8.8.
 * Captured: dig @8.8.8.8 google.com A
 * Sections: ancount=1, nscount=0, arcount=0
 */
export const decoded: DnsMessageResponse = {
  header: {
    transactionId: '0xaaaa',
    flags: {
      qr: 1,
      opcode: 0,
      aa: 0,
      tc: 0,
      rd: 1,
      ra: 1,
      rcode: 0,
    },
    qdcount: 1,
    ancount: 1,
    nscount: 0,
    arcount: 0,
  },
  questions: {
    name: 'google.com',
    class: 1,
    type: 1,
    totalLength: 16,
  },
  answers: [
    {
      name: 'google.com',
      type: 1,
      class: 1,
      ttl: 261,
      rdlength: 4,
      rdata: Buffer.from([142, 251, 41, 14]),
    },
  ],
}

/** Full response packet (45 bytes). Bytes 0–27 match queryWire in 00-query. */
export const wire = Buffer.from([
  0xaa, 0xaa, 0x81, 0x80, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x06,
  0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x03, 0x63, 0x6f, 0x6d, 0x00, 0x00, 0x01,
  0x00, 0x01, 0xc0, 0x0c, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x01, 0x05, 0x00,
  0x04, 0x8e, 0xfb, 0x29, 0x0e,
])
