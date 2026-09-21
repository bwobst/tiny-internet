import type { DnsMessageRequest } from '@dns/interfaces.js'

export type RecursionDesired = 0 | 1

export type GoogleComAQueryOptions = {
  /** Recursion Desired. 1 = ask a forwarder; 0 = iterative walk. */
  rd: RecursionDesired
}

/**
 * Shared google.com A query. Modes differ by `rd` today.
 * Pass an options object so later fields (name, type, id, …) can be added without breaking call sites.
 */
export const query = ({ rd }: GoogleComAQueryOptions): DnsMessageRequest => ({
  header: {
    transactionId: '0xaaaa',
    flags: {
      qr: 0,
      opcode: 0,
      aa: 0,
      tc: 0,
      rd,
      ra: 0,
      rcode: 0,
    },
    qdcount: 1,
    ancount: 0,
    nscount: 0,
    arcount: 0,
  },
  questions: {
    name: 'google.com',
    class: 1,
    type: 1,
    totalLength: 16,
  },
})

/** Header + question only (28 bytes). Flag byte 3 is 0x01 when RD=1, else 0x00. */
export const wire = ({ rd }: GoogleComAQueryOptions): Buffer =>
  Buffer.from([
    0xaa,
    0xaa,
    rd === 1 ? 0x01 : 0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x06,
    0x67,
    0x6f,
    0x6f,
    0x67,
    0x6c,
    0x65,
    0x03,
    0x63,
    0x6f,
    0x6d,
    0x00,
    0x00,
    0x01,
    0x00,
    0x01,
  ])
