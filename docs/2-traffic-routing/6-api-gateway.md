### Stage 6 · API gateway

> Give the front door policy.

**In the platform:** The site's `/api/*` routes need to behave differently from its static pages - different rate limits, different auth, different backends. The gateway is where that policy lives instead of being scattered through each backend.

**Scope:** the routing and policy rules your own site needs. Build it when the site has API routes worth protecting.


**Recommended stack:** Node.js

#### Step 1 - Request routing to microservices

**Goal:** Match incoming request paths to backend services using a configurable routing table.

**Inputs & outputs:**
- Input: incoming request + routing config like `[{ prefix: "/users", upstream: "http://localhost:3001" }, ...]`
- Output: request forwarded to the matching upstream; path prefix stripped or preserved per config

**Key questions:**
- Should prefix matching be first-match or longest-match wins? Why does it matter?
- Do you strip the matched prefix before forwarding (e.g. `/users/123` → `/123`) or pass it through?
- What happens when no route matches?

**Done when:**
- `GET /users/42` reaches the users service at `/42` (if stripping) or `/users/42` (if not)
- `GET /orders/7` reaches the orders service
- `GET /unknown` returns `404` from the gateway, not from any upstream

**Watch out:** A prefix `/api` will also match `/api-docs`. Match on `/api/` or check for exact segment boundaries to avoid this.

---

#### Step 2 - Token-based authentication middleware

**Goal:** Validate a bearer token on every request before forwarding, and reject unauthorized requests.

**Inputs & outputs:**
- Input: `Authorization: Bearer <token>` header
- Output: validated identity object attached to the request context (forwarded as a header to the upstream); `401` on missing/invalid token

**Key questions:**
- Are you validating a JWT (verify signature + claims) or doing a lookup against a token store?
- What information should you forward to the upstream so it doesn't need to re-authenticate?
- What is the difference between 401 (unauthenticated) and 403 (unauthorized)?

**Done when:**
- A request with a valid token reaches the upstream and includes an `X-User-Id` (or similar) header
- A request with no token or an expired token returns `401` and never reaches the upstream
- Rotating the signing secret immediately invalidates all existing tokens

**Watch out:** If using JWTs, validate the `exp` claim - an expired but well-signed token must be rejected. Checking only the signature is not enough.

---

#### Step 3 - Rate limiting per client

**Goal:** Limit each client to N requests per time window using a sliding window or token bucket algorithm.

**Inputs & outputs:**
- Input: incoming request + client identifier (IP, API key, or user ID)
- Output: request forwarded if within limit; `429 Too Many Requests` with `Retry-After` header if exceeded

**Key questions:**
- What is your rate limit key? Per-IP, per-token, or per-user-ID?
- Fixed window vs. sliding window vs. token bucket - what are the trade-offs?
- Where do you store the counters? In-memory is fine for a single instance; what breaks at scale?

**Done when:**
- Sending 11 requests/second with a limit of 10/s causes the 11th to return `429`
- The `Retry-After` header reflects the correct number of seconds until the window resets
- After the window resets, the client can make requests again without restarting the server

**Watch out:** Fixed windows have a burst problem at window boundaries - a client can fire 10 requests just before midnight and 10 more just after, effectively getting 20 in 2 seconds. Know this trade-off before defending your design.
