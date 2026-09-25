export interface DnsHeader {
  transactionId: number
  flags: {
    qr: number
    opcode: number
    aa: number
    tc: number
    rd: number
    ra: number
    rcode: number
  }
  qdcount: number
  ancount: number
  nscount: number
  arcount: number
}

export interface DnsQuestion {
  name: string
  type: number
  class: number
}

export interface DnsResourceRecord {
  name: string
  type: number
  class: number
  ttl: number
  rdlength: number
  rdata: Buffer
}

export interface DnsQuery {
  header: DnsHeader
  questions: DnsQuestion[]
}

export interface DnsResponse {
  header: DnsHeader
  questions: DnsQuestion[]
  answers: DnsResourceRecord[]
}
