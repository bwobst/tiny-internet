### Stage 5 · HTTP cache

> Stop recomputing the same response for every request.

**Enables:** the site reports a MISS from origin, then a HIT with age and a shorter time.

**Scope:** a cache in front of one origin response, correct about freshness and honest about its own state. No CDN, no edge nodes, no per-client variants.

*Formerly: HTTP Cache Layer.*

#### Step 1 - Serve a MISS and store it

**Goal:** On the first request for a path, fetch the response from origin, mark it as a MISS, and store it for reuse.

**Shape:**
- Input: an HTTP request for a path with nothing cached for it yet
- Output:
  - the origin's response, returned to the client unchanged except for one added cache-state header
  - that response, kept somewhere the next request for the same path can find it
  - a freshness lifetime attached to what was stored

**Key questions:**
- What identifies a cache entry - the path alone, or something that also depends on request headers?
- Where does "how long is this still good for" come from? Does the origin have to say so, or can the cache decide on its own? (RFC 7234 §5.2 on `Cache-Control`)
- What has to be stored alongside the body to answer a later request without going back to origin - status, headers, timestamp, all three?

**Watch out:** A MISS still has to look like a normal response to the client. If the added header is the only difference, a client that doesn't know to look for it should see nothing broken.

**Samples:**

##### Sample 1 - first request is a MISS

```
curl -s -i http://127.0.0.1:8090/
```

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 60
X-Cache: MISS
X-Response-Time: 42ms
Connection: close

<!doctype html>
<html>
<body>Served by BRAVO</body>
</html>
```

**Done when:**
- first request is a MISS

---

#### Step 2 - Serve a HIT with age, then expire it

**Goal:** Answer a repeat request from the stored copy, report how long it has been sitting there, and stop trusting it once its freshness lifetime is up.

**Shape:**
- Input: a second request for the same path, before and then after the freshness lifetime from Step 1 elapses
- Output:
  - before expiry: the stored response, marked HIT, with its age since it was stored, returned faster than the Step 1 origin round trip
  - after expiry: origin fetched again, a fresh MISS, a new entry replacing the old one

**Key questions:**
- `Age` is a duration, not a timestamp. What do you measure it from, and at what point do you compute it - store time, or answer time?
- What makes a stored response too old to serve as a HIT? Where is that threshold checked?
- Two requests can arrive close together, before and after the same expiry instant. What should the second one see?

**Watch out:** A HIT that is faster only because the test happened to run fast isn't proof of anything. The Sample has to show the same path answered without a new origin round trip, and the origin's own latency has to still be visible in the MISS Sample for the comparison to mean something.

**Samples:**

##### Sample 2 - second request is a HIT with age

```
curl -s -i http://127.0.0.1:8090/
```

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 60
X-Cache: HIT
Age: 1
X-Response-Time: 1ms
Connection: close

<!doctype html>
<html>
<body>Served by BRAVO</body>
</html>
```

##### Sample 3 - request after expiry is a MISS again

```
curl -s -i http://127.0.0.1:8090/
```

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 60
X-Cache: MISS
X-Response-Time: 39ms
Connection: close

<!doctype html>
<html>
<body>Served by BRAVO</body>
</html>
```

**Done when:**
- second request is a HIT with age
- request after expiry is a MISS again

---

**Next:** the cache makes one path fast on one node, but BRAVO and CHARLIE still don't agree on anything. [Stage 6 · Key-value store](./9-key-value-store.md).
