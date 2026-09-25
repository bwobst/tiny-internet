### Stage 8 · Content delivery

> Treat the three nodes as content locations and decide where content lives.

**In the platform:** With three machines holding content, you have to answer where a given object should live, who serves it, and what happens when it changes. `/architecture` can show the answer moving in real time.

**Scope:** placement, origin fallback, and invalidation across three nodes in one house. Not a global edge network.


**Recommended stack:** Node.js

#### Step 1 - Cache responses from the origin

**Goal:** Forward a request to the origin server and store the response; serve subsequent requests from cache.

**Inputs & outputs:**
- Input: HTTP request for a cacheable resource
- Output: on miss, fetch from origin and store; on hit, return stored response with `X-Cache: HIT`

**Key questions:**
- What makes a response cacheable? Which HTTP methods and status codes qualify?
- What is your cache key? Just the path, or path + query string + `Vary` headers?
- Where do you store the cached response - in memory, on disk, or both?

**Done when:**
- First request logs `[MISS]` and takes ≥50ms (simulate origin latency); second request logs `[HIT]` and takes <5ms
- `X-Cache: HIT` and `X-Cache: MISS` headers are set correctly on all responses

**Watch out:** The `Vary` header from the origin tells you which request headers affect the response (e.g. `Vary: Accept-Encoding`). Ignoring it means serving a gzipped response to a client that didn't ask for compression.

---

#### Step 2 - Respect Cache-Control directives

**Goal:** Honor `Cache-Control` headers from both the origin (response) and the client (request).

**Inputs & outputs:**
- Input: responses with `Cache-Control: max-age=N`, `no-store`, `private`, `no-cache`; requests with `Cache-Control: no-cache`
- Output: correct caching behavior for each directive

**Key questions:**
- What is the difference between `no-cache` and `no-store`?
- What does `private` mean for a shared cache like a CDN?
- When a client sends `Cache-Control: no-cache`, what should your edge node do?

**Done when:**
- A response with `Cache-Control: no-store` is never stored
- A response with `Cache-Control: private` is served to the original client but not cached for others
- A client `no-cache` request causes revalidation with the origin even if a fresh cached copy exists

**Watch out:** `no-cache` does **not** mean "don't cache" - it means "revalidate before serving from cache." Only `no-store` means don't cache at all. Swapping these is the most common CDN misconfiguration.

---

#### Step 3 - TTL expiry and origin fallback

**Goal:** Expire stale cache entries using `max-age` and re-fetch from origin; serve stale content if origin is unreachable.

**Inputs & outputs:**
- Input: a cached entry whose `max-age` has elapsed; optionally an unavailable origin
- Output: on expiry with reachable origin, fetch fresh copy; on expiry with unreachable origin, serve stale with `Warning: 110` header

**Key questions:**
- How do you calculate when a cached entry expires? (Creation time + `max-age`)
- What is `stale-while-revalidate`, and how would you implement it?
- What is the correct HTTP warning code for "response is stale"?

**Done when:**
- Waiting for `max-age` to expire causes the next request to fetch from origin (`[MISS]`)
- Stopping the origin server causes stale content to be served with the correct `Warning` header, rather than a `502`

**Watch out:** Clock skew between your server and the client can cause entries to expire too early or too late. Use the origin's `Date` response header as the reference point for age calculations, not your local clock at store time.
