import type { DnsMessageResponse } from '@dns/interfaces.js'

/**
 * Hop 3: authoritative final answer.
 * Query: query({ rd: 0 }) → 216.239.32.10 (ns1.google.com glue from hop 2)
 * Captured: dig @216.239.32.10 google.com A +norecurse
 * Sections: ancount=1, nscount=0, arcount=0
 * Packet shape: same as recursive/01-answer (one A), AA=1.
 */
export const expected: DnsMessageResponse = {
  header: {
    transactionId: '0xaaaa',
    flags: {
      qr: 1,
      opcode: 0,
      aa: 1,
      tc: 0,
      rd: 0,
      ra: 0,
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
      ttl: 300,
      rdlength: 4,
      rdata: Buffer.from([0x8e, 0xfb, 0xd7, 0xae]),
    },
  ],
}

export const wire = Buffer.from([
  0xaa, 0xaa, 0x84, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x06,
  0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x03, 0x63, 0x6f, 0x6d, 0x00, 0x00, 0x01,
  0x00, 0x01, 0xc0, 0x0c, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x01, 0x2c, 0x00,
  0x04, 0x8e, 0xfb, 0xd7, 0xae,
])
