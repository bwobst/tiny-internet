### Stage 3 · HTTP server

> Build the first thing a person can actually see.

**Enables:** `pi.world/` serves a static page from BRAVO.

**Scope:** Enough HTTP/1.1 to parse a request, write a valid response, and answer `GET /` on BRAVO. No keep-alive, no chunked encoding, no framework - you build this on your Stage 2 transport.

#### Step 1 - Parse a request

**Goal:** Decode an inbound HTTP/1.1 request into a request object.

**Shape:**
- Input: TCP bytes from an accepted connection
- Output:
  - method: string
  - path: string
  - httpVersion: string
  - headers: list of
    - name: string
    - value: string
  - body: bytes

**Key questions:**
- Where does the request line end and the headers begin? (RFC 7230 §3)
- TCP delivers bytes as a stream with no message boundaries. How do you know the header block is complete before you try to parse it?
- Which header tells you how many body bytes follow, and what do you read when a request has no body at all?

**Watch out:** The blank line that ends the headers can arrive split across two separate reads from the socket. Buffer until the terminator shows up in the accumulated bytes; don't assume one read gives you one message.

**Samples:**

##### Sample 1 - GET / request

The oracle is the bytes in [`01-request.bin`](../../packages/http/src/fixtures/get-root/01-request.bin) and the decoded object in [`01-request.ts`](../../packages/http/src/fixtures/get-root/01-request.ts).

**Done when:**
- GET / request

---

#### Step 2 - Encode a response

**Goal:** Encode a response object into HTTP/1.1 response bytes.

**Shape:**
- Input:
  - statusCode: integer
  - statusText: string
  - headers: list of
    - name: string
    - value: string
  - body: bytes
- Output: bytes

**Key questions:**
- What is the required format of the status line? (RFC 7230 §3.1.2)
- With no chunked encoding, which header tells the client where the body ends?
- Where does the header block end and the body begin on the wire?

**Watch out:** A response with no `Content-Length` and no `Connection: close` gives the client no way to know the message is finished. It will sit waiting for more bytes even after the body already arrived.

**Samples:**

##### Sample 1 - 200 response for pi.world

The oracle is the bytes in [`02-response.bin`](../../packages/http/src/fixtures/get-root/02-response.bin) and the decoded object in [`02-response.ts`](../../packages/http/src/fixtures/get-root/02-response.ts).

**Done when:**
- 200 response for pi.world

---

#### Step 3 - Serve pi.world/ on BRAVO

**Goal:** Listen on BRAVO and answer `GET /` with the product page, so Compose `curl` matches this transcript.

**Shape:**
- Input: a `GET /` request arriving on BRAVO's HTTP port
- Output: the Step 2 response for the page, written back on the same connection, then the connection closes

**Key questions:**
- Which address does BRAVO bind to so a request from ALPHA, not just from BRAVO itself, is answered?
- What does the server send back for a path other than `/`?
- Compose publishes BRAVO's HTTP port to a different number on the host than the port the server binds inside the container. Which port does a request from inside another Node's container use?

**Watch out:** Without `Connection: close` (or a correct `Content-Length`), `curl` hangs past the point the body already arrived, waiting for a server that thinks the response isn't done. Keep the connection semantics from Step 2 - this stage does not add keep-alive.

**Samples:**

##### Sample 1 - curl pi.world from alpha

```
docker compose exec alpha curl -s -i http://bravo/
```

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 53
Connection: close

<!doctype html>
<html>
<body>pi.world</body>
</html>
```

**Done when:**
- curl pi.world from alpha

---

**Next:** BRAVO answers, but only over a connection you opened straight to it. [Stage 4 · Load balancer](../2-traffic-routing/4-load-balancer.md).
