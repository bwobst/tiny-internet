export interface HttpHeader {
  name: string
  value: string
}

export interface HttpRequest {
  method: string
  path: string
  httpVersion: string
  headers: HttpHeader[]
  body: Buffer
}

export interface HttpResponse {
  statusCode: number
  statusText: string
  headers: HttpHeader[]
  body: Buffer
}
