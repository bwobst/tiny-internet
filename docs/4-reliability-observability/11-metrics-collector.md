### Stage 10 · Metrics collector

> Count and time everything.

**In the platform:** This is what `/status` and `/metrics` display: `http_requests_total`, `http_request_duration_ms`, `http_errors_total`, `cache_hits_total`, `cache_misses_total`, `active_connections`. Until this exists, you are guessing about your own system.

**Scope:** collection, storage, and exposition for three nodes. Not Prometheus. Do not use Prometheus to build it.

*Formerly: Metrics Collector.*

**Recommended stack:** Node.js

#### Step 1 - Counter and gauge primitives

**Goal:** Implement counter (monotonically increasing) and gauge (current value) metric types with label support.

**Inputs & outputs:**
- Input: `counter.increment({ method: "GET", status: "200" })`, `gauge.set(42, { service: "api" })`
- Output: current values accessible via `counter.get(labels)` and `gauge.get(labels)`

**Key questions:**
- How do you store metrics with multi-dimensional labels? (A nested map keyed on label hashes?)
- What is the difference between a counter and a gauge? Can a counter decrease?
- How do you serialize a label set to a stable string key?

**Done when:**
- Two counters with different label sets are tracked independently
- Incrementing `{ method: "GET" }` does not affect `{ method: "POST" }`
- `counter.get({ method: "GET", status: "200" })` returns the exact increment count

**Watch out:** Label key order matters for your cache key - `{a: 1, b: 2}` and `{b: 2, a: 1}` should map to the same metric. Sort label keys before serializing.

---

#### Step 2 - Histogram for latency tracking

**Goal:** Record observations into configurable buckets; expose count, sum, and per-bucket totals.

**Inputs & outputs:**
- Input: `histogram.observe(durationMs, labels)` with predefined buckets e.g. `[10, 50, 100, 500, 1000]`
- Output: `{ buckets: { "10": N, "50": N, ... }, sum, count }` per label set

**Key questions:**
- Are histogram buckets inclusive (`≤`) or exclusive (`<`)? What does Prometheus use?
- How do you calculate the p95 from a histogram? (You can't exactly - explain why.)
- What is a cumulative histogram vs. a non-cumulative one?

**Done when:**
- 1000 observations distributed across buckets are counted correctly (verify by summing all observations)
- The `+Inf` bucket count equals the total observation count
- `sum / count` gives the correct mean

**Watch out:** Prometheus histograms are *cumulative* - the `100ms` bucket counts all observations ≤100ms, not just those between 50ms and 100ms. If you implement non-cumulative buckets, your data will not be compatible with standard tooling.

---

#### Step 3 - Prometheus-compatible scrape endpoint

**Goal:** Expose all metrics in Prometheus text format at `GET /metrics`.

**Inputs & outputs:**
- Input: HTTP GET `/metrics`
- Output: Prometheus exposition format text: `# HELP`, `# TYPE`, and metric lines

**Key questions:**
- What is the Prometheus text format specification for counters, gauges, and histograms?
- What Content-Type header does Prometheus expect?
- How do you format label sets in the `{key="value"}` syntax, including escaping?

**Done when:**
- `curl http://localhost:9090/metrics` returns parseable Prometheus text
- Pointing a real Prometheus instance (or `promtool check metrics`) at your endpoint reports no parse errors
- All three metric types render correctly with their `# TYPE` annotations

**Watch out:** Label values containing `\`, `"`, or `\n` must be escaped in the exposition format. Forgetting this causes parse failures that are difficult to diagnose.
