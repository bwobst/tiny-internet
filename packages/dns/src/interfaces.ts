export const HEADER_LENGTH = 12

interface DnsMessageHeader {
  transactionId: string
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

interface DnsMessageQuestions {
  name: string
  type: number
  class: number
  totalLength: number
}

export interface DnsMessageRequest {
  header: DnsMessageHeader
  questions: DnsMessageQuestions
}

export interface DnsMessageResponse {
  header: DnsMessageHeader
  questions?: DnsMessageQuestions
  answers?: ResourceRecord[]
  authority?: ResourceRecord[]
  additional?: ResourceRecord[]
}

export interface ResourceRecord {
  name: string
  type: number
  class: number
  ttl: number // seconds
  rdlength: number // byte length of rdata
  rdata: Buffer // raw bytes (to be interpreted per type later)
}
