import type { HttpResponse } from '@http/interfaces.js'

/**
 * 200 response for the pi.world product page.
 * Oracle for Stage 3 Step 2.
 */
export const body = Buffer.from(
  '<!doctype html>\n<html>\n<body>pi.world</body>\n</html>\n',
)

export const expected: HttpResponse = {
  statusCode: 200,
  statusText: 'OK',
  headers: [
    { name: 'Content-Type', value: 'text/html' },
    { name: 'Content-Length', value: String(body.length) },
    { name: 'Connection', value: 'close' },
  ],
  body,
}

/** Status line + headers + blank line + body (136 bytes). */
export const wire = Buffer.concat([
  Buffer.from(
    'HTTP/1.1 200 OK\r\n' +
      'Content-Type: text/html\r\n' +
      `Content-Length: ${body.length}\r\n` +
      'Connection: close\r\n' +
      '\r\n',
  ),
  body,
])
