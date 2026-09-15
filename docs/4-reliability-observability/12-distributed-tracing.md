### Stage 8 · Tracing

> Follow one request across every hop it took through the cluster.

**Enables:** `/architecture` shows a live request path with a duration on each hop.

**Scope:** Trace context carried across your own front door and backend for one request at a time. One in-memory record of the most recently completed request's path. No OTLP export, no external collector, no historical trace storage.

*Formerly: Distributed Tracing.*

#### Step 1 - Show the path of one request

**Goal:** Serve `/architecture` with the ordered list of hops the most recently completed request passed through.

**Shape:**
- Input: a request arriving at ALPHA's front door, forwarded to one backend
- Output: `/architecture`: a page listing hop names in the order the request visited them

**Key questions:**
- ALPHA and the backend are separate processes. How does the backend know it's continuing the same request ALPHA is already tracking, rather than starting a path of its own?
- Front door forwards to one backend and returns. What is the shortest possible path, and what does `/architecture` show if a second request is still in flight when you check it?
- Does every request update what `/architecture` shows, or only requests to `/`?

**Watch out:** If each hop invents its own identifier for the request instead of carrying forward one it received, two hops of the same request look like two separate, unrelated requests, and `/architecture` cannot reassemble a path at all.

**Samples:**

##### Sample 1 - architecture after one request to /

```
curl -s http://127.0.0.1:8080/ > /dev/null
curl -s http://127.0.0.1:8080/architecture
```

```
hop
alpha
bravo
```

**Done when:**
- architecture after one request to /

---

#### Step 2 - Add a duration to each hop

**Goal:** Alongside each hop, show how long that hop took, at `/architecture`.

**Shape:**
- Input: the same forwarded request, plus how long each hop spent handling it
- Output: `/architecture`: the same ordered hops, each with a duration

**Key questions:**
- Front door's own time and the backend's own time overlap for part of the request. Is a hop's duration "wall time end to end at that hop" or "time until the next hop was called," and does that choice change what the numbers mean?
- What clock resolution does a duration need, given some hops in this cluster answer in a handful of milliseconds?
- Stage 7's `/metrics` keeps a running average across many requests. `/architecture` shows one request's durations. Do these have to share any code, or are they answering different questions?

**Watch out:** Reading the clock after work has already started, or before the response has actually left, makes every hop look faster than it was, and the slow hop this page exists to find stops being visible.

**Samples:**

##### Sample 2 - architecture shows a duration per hop

```
curl -s http://127.0.0.1:8080/ > /dev/null
curl -s http://127.0.0.1:8080/architecture
```

```
hop	duration_ms
alpha	2
bravo	36
```

**Done when:**
- architecture shows a duration per hop

---

**Next:** the platform can see its own request path, but a node killed mid-write still loses data. [Stage 9 · Write-ahead log](../5-data-storage/13-write-ahead-log.md).
