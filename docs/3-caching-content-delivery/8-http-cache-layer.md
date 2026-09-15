### Stage 7 · HTTP cache layer

> Cache expensive responses at the edge.

**In the platform:** The site reports its own cache behavior. `/api/status` returns `MISS origin: bravo 42ms`, then on refresh `HIT age: 1.2s 0.7ms`. The optimization is only interesting because you can watch it work.

**Scope:** correct revalidation and expiry for your own responses. Correctness matters more than hit rate here.

*Formerly: HTTP Cache Layer.*

**Recommended stack:** Node.js

#### Step 1 - Generate and validate ETags

**Goal:** Compute a fingerprint for each response body and use it to avoid re-sending unchanged content.

**Inputs & outputs:**
- Input: response body bytes
- Output: `ETag` header on the response; `304 Not Modified` (with no body) when a conditional GET matches

**Key questions:**
- How do you generate an ETag? (MD5, SHA-1, content length + mtime - pick one and know its trade-offs)
- What is the `If-None-Match` request header, and how do you validate it?
- What headers must you still include in a `304` response even though there's no body?

**Done when:**
- `curl -I http://localhost:3000/file.js` returns an `ETag` header
- `curl -H 'If-None-Match: <etag>'` returns `304` with no body and the same `ETag`
- Modifying the resource changes the `ETag` and the next conditional request returns `200`

**Watch out:** A `304` response must still include `Cache-Control`, `ETag`, `Expires`, and `Vary` - the same headers you'd send on a `200`. Omitting them prevents the client from updating its cache metadata.

---

#### Step 2 - Last-Modified and conditional range requests

**Goal:** Support time-based conditional requests using `Last-Modified` / `If-Modified-Since`.

**Inputs & outputs:**
- Input: `If-Modified-Since` header in a GET request
- Output: `304` if resource hasn't changed since that date; `200` with full body if it has

**Key questions:**
- What HTTP date format does `Last-Modified` use? (RFC 7231)
- What is the precedence rule when both `If-None-Match` and `If-Modified-Since` are present?
- How do you get the mtime of a file in Node.js, and how do you format it correctly?

**Done when:**
- `curl -z "Thu, 01 Jan 2099 00:00:00 GMT" http://localhost:3000/file.js` returns `304`
- `curl -z "Thu, 01 Jan 2000 00:00:00 GMT" http://localhost:3000/file.js` returns `200` with the full file

**Watch out:** HTTP dates use a specific format (`Mon, 02 Jan 2006 15:04:05 GMT`). JavaScript's `new Date().toUTCString()` is close but not always RFC 7231-compliant across environments. Use `toUTCString()` and verify the output format manually.

---

#### Step 3 - Vary header and content negotiation caching

**Goal:** Store and serve different cached variants of the same URL based on client capabilities.

**Inputs & outputs:**
- Input: same URL requested by clients with different `Accept-Encoding` (gzip vs. identity)
- Output: `Vary: Accept-Encoding` on response; separate cache entries per encoding; correct variant served to each client

**Key questions:**
- How do you incorporate `Vary` fields into your cache key?
- What happens if you cache a gzip-encoded response and serve it to a client that doesn't accept gzip?
- Should you normalize `Accept-Encoding` values before using them as cache keys? Why?

**Done when:**
- A gzip-capable client receives the compressed variant; a non-gzip client receives the uncompressed variant, from the same cache
- Both variants are stored and retrieved independently without one overwriting the other

**Watch out:** `Accept-Encoding` values can be `gzip, deflate, br` in any order with varying quality values (`;q=0.9`). Normalize to a canonical form (e.g. sorted, lowercased, quality stripped) before hashing into your cache key.
