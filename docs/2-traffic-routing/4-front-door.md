### Stage 4 · Front door

> Give `pi.world` one public entry on ALPHA, and let it survive a dead backend.

**Enables:** `pi.world` has one public entry on ALPHA. You shut BRAVO down. The page says Served by CHARLIE.

**Scope:** One process on ALPHA forwarding real HTTP/1.1 traffic to BRAVO and CHARLIE, spreading requests across both while they answer, and routing around one that stops answering. No TLS, no virtual hosts, no least-connections, no rate limiting or auth.

*Formerly: Reverse Proxy and Load Balancer.*

#### Step 1 - Forward across a pool of backends

**Goal:** Accept an inbound request on ALPHA, forward it to one backend chosen from a pool of two, return that backend's response to the client unchanged, and send the next request to a different backend.

**Shape:**
- Input:
  - request: an HTTP request arriving on ALPHA's port 80
  - pool: list of backend addresses (BRAVO, CHARLIE)
- Output:
  - the request, forwarded to one backend from `pool`, with `X-Forwarded-For` added
  - the chosen backend's response, returned to the client with no other change to status, headers, or body
  - the following request forwarded to a different backend than this one

**Key questions:**
- Which headers are hop-by-hop (RFC 7230 §6.1) and must be regenerated on the new connection to the backend, rather than copied straight off the client's connection?
- Stage 3's backends answer once per connection and close it. Does the front door open a fresh connection to the backend for every request it forwards, or try to reuse one?
- Where does "which backend is next" live so it survives across separate incoming connections, not just inside the function handling one of them?

**Watch out:** Compose publishes ALPHA's port 80 to the host as 8080. A curl from the laptop uses `127.0.0.1:8080`; a request from inside BRAVO's or CHARLIE's container uses `alpha` on port 80 directly, the same as Stage 3's backends.

**Samples:**

##### Sample 1 - first request goes to bravo

```
curl -s -i http://127.0.0.1:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 60
Connection: close

<!doctype html>
<html>
<body>Served by BRAVO</body>
</html>
```

##### Sample 2 - second request goes to charlie

```
curl -s -i http://127.0.0.1:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 62
Connection: close

<!doctype html>
<html>
<body>Served by CHARLIE</body>
</html>
```

**Done when:**
- first request goes to bravo
- second request goes to charlie

---

#### Step 2 - Route around a dead backend

**Goal:** Stop sending new requests to a backend that has stopped answering, so a client hitting ALPHA never sees a failed request once another backend is reachable.

**Shape:**
- Input: a connection attempt or response wait against a backend from the Step 1 pool that errors or times out
- Output:
  - that backend excluded from the rotation Step 1 uses, until it is judged healthy again
  - the request that hit the dead backend still answered, from a different backend, without the client seeing an error

**Key questions:**
- What counts as "dead" here - connection refused, connection reset, a timeout, or all three? What timeout is defensible for a backend Docker just stopped, versus one that is merely slow?
- Does the request that hit the dead backend get retried against a different backend inside the front door, or does the client have to issue it again itself? Reread the Enables line before answering.
- This stage does not ask for automatic recovery. Is a backend, once marked dead, allowed to stay excluded for the rest of the run?

**Watch out:** `docker compose stop bravo` does not always hand you a clean "connection refused" on the very next request - a listener shutting down can also hand you a connection reset partway through. Treat both as dead, not only the refusal case.

**Samples:**

##### Sample 3 - curl pi.world with both backends up

```
curl -s -i http://127.0.0.1:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 60
Connection: close

<!doctype html>
<html>
<body>Served by BRAVO</body>
</html>
```

##### Sample 4 - curl pi.world after bravo dies

After `docker compose stop bravo`:

```
curl -s -i http://127.0.0.1:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 62
Connection: close

<!doctype html>
<html>
<body>Served by CHARLIE</body>
</html>
```

**Done when:**
- curl pi.world with both backends up
- curl pi.world after bravo dies

---

**Next:** ALPHA survives a dead backend, but every request still recomputes the same response from scratch. [Stage 5 · HTTP cache](../3-caching-content-delivery/8-http-cache-layer.md).
