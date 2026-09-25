### Stage 7 · Metrics collector

> Stop guessing how busy the cluster is and how long it takes to answer.

**Enables:** `/metrics` and `/status` show request counts and timings.

**Scope:** cluster-wide request counts and per-path average duration, observed at the load balancer on ALPHA. No Prometheus exposition format, no histograms or percentiles, no persistence across restarts.

**Read:** [Monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/).
Traffic is how many requests arrived.
Latency is how long they took.

#### Step 1 - Count every request, show it at /status

**Goal:** On ALPHA, count every request the load balancer forwards, broken down by path, and serve the running counts at `/status`.

**Shape:**
- Input: each request ALPHA forwards to a backend
- Output:
  - a running count per path
  - `/status`: a page listing each path seen so far and its request count

**Read:** [The RED method](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/).
Rate is the count of requests.
Keep that count per path.

**Key questions:**
- Does a count belong to the path the client requested, or the backend that answered it? If `/` is served by BRAVO once and CHARLIE once, is that one count or two?
- Where does the increment happen relative to forwarding - before the backend answers, after, or only once a response comes back?
- `/status` has to report on any path the site gets, not only ones you tested by hand. Does it need to know every path in advance, or can a path's first request be the thing that puts it on the page?

**Watch out:** Stage 4's dead-backend handling means a request can fail before any backend answers it. If the counter only increments once a response comes back, that request disappears from `/status` instead of showing up as a failure. Decide what "a request happened" means before you start incrementing.

**Samples:**

##### Sample 1 - status after three requests to /

```
curl -s http://127.0.0.1:8090/ > /dev/null
curl -s http://127.0.0.1:8090/ > /dev/null
curl -s http://127.0.0.1:8090/ > /dev/null
curl -s http://127.0.0.1:8090/status
```

```
path	count
/	3
```

**Done when:**
- status after three requests to /

---

#### Step 2 - Time every request, show it at /status and /metrics

**Goal:** Alongside the count, track how long each forwarded request took, and serve the same numbers at both `/status` and `/metrics`.

**Shape:**
- Input: each forwarded request, plus the elapsed time until its response was returned to the client
- Output:
  - `/status`: count and average duration per path, human-readable
  - `/metrics`: the same count and average duration per path, in one machine-parseable line per path

**Read:** [Cumulative average](https://en.wikipedia.org/wiki/Moving_average#Cumulative_average).
Keep the count and the current average.
A new duration updates that average in place.

**Key questions:**
- Keeping every duration ever recorded to compute an average is the same unbounded-memory trap as Stage 5's cache. What running values do you keep per path instead so a new duration updates the average without storing the durations themselves?
- `/status` and `/metrics` show the same counts and durations in different shapes. Where do those numbers live so both pages read one source instead of drifting apart?
- What does a path with zero requests so far show on `/metrics` - is it listed at all?

**Watch out:** `/status` and `/metrics` are requests too. If they get counted like any other path, checking `/status` changes the number `/status` reports next time you check it. Decide up front whether the metrics endpoints exempt themselves, and make sure both pages agree.

**Samples:**

##### Sample 2 - status shows counts and average duration

```
curl -s http://127.0.0.1:8090/ > /dev/null
curl -s http://127.0.0.1:8090/status
```

```
path	count	avg_ms
/	4	38
```

##### Sample 3 - metrics shows the same numbers

```
curl -s http://127.0.0.1:8090/metrics
```

```
/ count=4 avg_ms=38
```

**Done when:**
- status shows counts and average duration
- metrics shows the same numbers

---

**Next:** you can see how busy the cluster is, but not which hop of a request took the time. [Stage 8 · Distributed tracing](./12-distributed-tracing.md).
