import type { DnsQuery } from '@naming/interfaces.js'

/**
 * Inbound A query for the zone apex.
 * Oracle for Stage 1 Step 1. Not a captured public-resolver packet.
 */
export const expected: DnsQuery = {
  header: {
    transactionId: 0xaaaa,
    flags: {
      qr: 0,
      opcode: 0,
      aa: 0,
      tc: 0,
      rd: 1,
      ra: 0,
      rcode: 0,
    },
    qdcount: 1,
    ancount: 0,
    nscount: 0,
    arcount: 0,
  },
  questions: [
    {
      name: 'pi.world',
      type: 1,
      class: 1,
    },
  ],
}

/** Header + question (26 bytes). RD=1, same as a default `dig` query. */
export const wire = Buffer.from([
  0xaa, 0xaa, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
  0x70, 0x69, 0x05, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x00, 0x00, 0x01, 0x00, 0x01,
])
