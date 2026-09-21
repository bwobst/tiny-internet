### Stage 4 · Reverse proxy

> Put something in front of the backends.

**In the platform:** ALPHA becomes the single public entry point for `pi.world`. Backends stop being directly addressable, which is what makes the next stage - moving traffic between them - possible at all.

**Scope:** forwarding, header handling, and connection management for your own site.

*Formerly: Reverse Proxy.*

**Recommended stack:** Node.js (`http`, `https`, `tls`)

#### Step 1 - HTTP request forwarding with header rewriting

**Goal:** Accept a request, rewrite necessary headers, forward to an upstream, and return the upstream's response.

**Inputs & outputs:**
- Input: client HTTP request with original `Host`, `Connection`, and other headers
- Output: forwarded request with `X-Forwarded-For`, `X-Forwarded-Proto`, and `Via` added; upstream response returned verbatim

**Key questions:**
- Which hop-by-hop headers (e.g. `Connection`, `Transfer-Encoding`) must be stripped before forwarding?
- How do you handle streaming response bodies without buffering them entirely in memory?
- What is the `Via` header and what format does it use?

**Done when:**
- `curl -H "Host: myapp.local" http://localhost:8090/` is forwarded to the correct upstream
- The upstream's access log shows the correct client IP in `X-Forwarded-For`
- Large file downloads stream through without memory usage growing

**Watch out:** Don't forget to strip `Connection` and its nominated headers before forwarding. Passing `Connection: keep-alive` to some upstreams causes protocol errors.

---

#### Step 2 - SSL/TLS termination

**Goal:** Accept HTTPS connections from clients, terminate TLS, and forward plain HTTP to upstream backends.

**Inputs & outputs:**
- Input: HTTPS request (TLS) on port 443
- Output: decrypted HTTP request forwarded to upstream on port 80; upstream's HTTP response re-encrypted back to client

**Key questions:**
- How do you create a self-signed certificate for local testing?
- What Node.js APIs are used to create an HTTPS server vs. an HTTP server?
- What header should you set so the upstream knows the original protocol was HTTPS?

**Done when:**
- `curl -k https://localhost:8443/` returns the upstream's response
- The upstream receives `X-Forwarded-Proto: https`
- `openssl s_client -connect localhost:8443` shows your certificate in the handshake

**Watch out:** `https.createServer` needs `key` and `cert` options - the raw PEM strings, not file paths. Read the files and pass their contents.

---

#### Step 3 - Virtual host routing

**Goal:** Route requests to different upstreams based on the `Host` header.

**Inputs & outputs:**
- Input: a routing table mapping hostnames to upstream URLs: `{ "api.local": "http://localhost:3001", "app.local": "http://localhost:3002" }`
- Output: requests routed to the correct upstream; unrecognized hosts receive `502 Bad Gateway`

**Key questions:**
- Where do you strip the port from the `Host` header before matching?
- How do you handle wildcard or prefix matching (e.g. `*.example.com`)?
- What response should an unrecognized host receive, and what body?

**Done when:**
- Requests with `Host: api.local` consistently reach the API upstream, and `Host: app.local` consistently reach the app upstream
- An unknown host returns `502` with a meaningful error body (not a silent connection close)

**Watch out:** `Host` headers include the port when it's non-standard (e.g. `api.local:8090`). Split on `:` and match on the hostname portion only.
