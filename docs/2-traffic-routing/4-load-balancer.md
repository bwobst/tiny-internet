### Stage 5 · Load balancing

> Spread traffic across BRAVO and CHARLIE, and notice when one stops answering.

**In the platform:** This is the defining moment of the project. The page says `Served by BRAVO`. You `ssh bravo; sudo shutdown now`. The page says `Served by CHARLIE`. Health checking exists here because a real machine really went away.

**Scope:** balancing across two real backends with real health checks. Failure is physical, not simulated.

*Formerly: Load Balancer.*

**Recommended stack:** Node.js (`http` or `net`)

#### Step 1 - Round-robin request forwarding

**Goal:** Accept incoming HTTP requests and forward them to a rotating pool of backend servers.

**Inputs & outputs:**
- Input: HTTP request from a client
- Output: the request proxied to one backend; the backend's response returned to the client

**Key questions:**
- How do you forward a request - do you open a new connection to the backend per request, or reuse connections?
- Which request headers must you pass through unchanged, and which should you add (e.g. `X-Forwarded-For`)?
- How do you pass the response status, headers, and body back to the original client?

**Done when:**
- Three backend servers started on ports 3001–3003 each respond with their own port number
- 300 sequential requests distribute ~100 each to all three (verify with access logs)

**Watch out:** HTTP/1.1 `Host` header on the forwarded request must match what the backend expects. Forgetting to rewrite it breaks backends that do virtual hosting.

---

#### Step 2 - Least-connections load balancing

**Goal:** Route each new request to the backend with the fewest in-flight requests.

**Inputs & outputs:**
- Input: incoming request + current in-flight count per backend
- Output: the chosen backend; count incremented on dispatch, decremented on response end

**Key questions:**
- Where do you track the in-flight count - in a module-level map, or on a backend object?
- When exactly do you decrement? On response `end`? On socket `close`? What about errors?
- What happens when all backends are tied? (Any tiebreak is valid - pick one and stick with it.)

**Done when:**
- With one slow backend (simulated with `setTimeout`), new requests avoid it and pile onto the faster backends
- After all in-flight requests complete, counts return to 0 for all backends

**Watch out:** Decrement the counter in a `finally`-equivalent handler that fires on *both* success and error. Missing the error path leaks the counter upward until that backend is never chosen again.

---

#### Step 3 - Active health checks

**Goal:** Periodically probe each backend and remove unhealthy ones from rotation until they recover.

**Inputs & outputs:**
- Input: a configurable probe interval and endpoint (e.g. `GET /health`)
- Output: backends marked healthy/unhealthy; unhealthy backends skipped during routing; re-added after N consecutive successes

**Key questions:**
- What constitutes "unhealthy"? HTTP 5xx? Connection refused? Timeout?
- How many consecutive failures before marking unhealthy, and how many successes to recover?
- What should happen to in-flight requests on a backend that just became unhealthy?

**Done when:**
- Killing a backend process causes it to drop from rotation within one probe interval
- Restarting the backend causes it to rejoin after N successful probes
- A client making continuous requests never sees an error response due to a downed backend (after the first probe cycle)

**Watch out:** Don't remove a backend from the pool mid-request. Mark it unhealthy so *new* requests skip it, but let in-flight requests complete (or fail naturally).
