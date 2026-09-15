### Stage 3 · HTTP

> Build the first thing a person can actually see.

**In the platform:** This turns BRAVO into a web server and gives `pi.world/` a page to return. The platform stops being three processes talking to each other and becomes something you can open in a browser.

**Scope:** enough HTTP/1.1 to serve the site correctly to a real browser. No framework - you build this on your Stage 2 transport.

*Formerly: HTTP/1.1 Server.*

**Recommended stack:** Node.js (built on your Stage 2 transport)

#### Step 1 - Parse a raw HTTP request

**Goal:** Read the bytes off a TCP connection and parse them into a structured request object.

**Inputs & outputs:**
- Input: raw HTTP/1.1 request bytes (e.g. from `curl --http1.1`)
- Output: `{ method, path, httpVersion, headers: Map, body: Buffer }`

**Key questions:**
- Where does the request line end and the headers begin?
- How do you know when the headers are complete? (Hint: `\r\n\r\n`)
- How do you know how many body bytes to read? Which headers tell you?

**Done when:**
- `curl -v http://localhost:3000/hello` shows your parsed method (`GET`), path (`/hello`), and all headers logged on the server
- A POST with a body is parsed with the correct body content

**Watch out:** HTTP headers are terminated by `\r\n\r\n`, but TCP may deliver that sequence across multiple `data` events. Buffer until you see the terminator before parsing.

---

#### Step 2 - Send valid HTTP responses

**Goal:** Write properly formatted HTTP/1.1 responses that browsers and `curl` accept.

**Inputs & outputs:**
- Input: a parsed request object and a desired response `{ statusCode, headers, body }`
- Output: a raw HTTP response written to the socket

**Key questions:**
- What is the mandatory format of the status line?
- Which response headers are required for the client to correctly determine message length?
- When is `Content-Length` required, and when is `Transfer-Encoding: chunked` preferred?

**Done when:**
- `curl -i http://localhost:3000/` shows `HTTP/1.1 200 OK`, correct headers, and your body
- A browser can load a simple HTML page served by your server

**Watch out:** If you omit `Content-Length` and don't use chunked encoding, most clients will hang waiting for more data. Always signal message end.

---

#### Step 3 - Implement keep-alive connection reuse

**Goal:** Serve multiple requests over a single TCP connection instead of closing after each one.

**Inputs & outputs:**
- Input: `Connection: keep-alive` header in the request
- Output: the connection stays open after the response; subsequent requests on the same socket are handled

**Key questions:**
- How do you know where one request ends and the next begins on the same socket?
- What should you do when a request includes `Connection: close`?
- How do you prevent a keep-alive connection from living forever?

**Done when:**
- `curl --http1.1 -v http://localhost:3000/ http://localhost:3000/about` shows both responses on a *single* TCP connection (look for "Re-using existing connection" in curl output)
- After an idle timeout, the server closes the connection and a new request opens a fresh one

**Watch out:** After sending a response, don't destroy the socket - return to the "waiting for request" state on the same socket. Destroying it is correct only for `Connection: close` or after the idle timeout fires.
