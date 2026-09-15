### Stage 11 · Distributed tracing

> Follow one request across every machine it touched.

**In the platform:** Metrics tell you the platform is slow. Tracing tells you where. `/architecture` shows one request's real path: DNS, proxy, cache, backend, storage, with a duration on each hop.

**Scope:** context propagation and span collection across your own services.

*Formerly: Distributed Tracing.*

**Recommended stack:** Node.js

#### Step 1 - Create and manage spans

**Goal:** Implement a span - a named, timed unit of work - with start/end timestamps and key-value attributes.

**Inputs & outputs:**
- Input: `tracer.startSpan(name, attributes?)`, followed by `span.end()`
- Output: a completed span object: `{ traceId, spanId, name, startTime, endTime, duration, attributes }`

**Key questions:**
- How do you generate a random 128-bit trace ID and 64-bit span ID? (hex strings are conventional)
- What timestamp resolution do you use - milliseconds or microseconds?
- What is the difference between a trace ID and a span ID?

**Done when:**
- Starting and ending a span produces a complete span object with non-zero duration
- Two spans started in the same "request" share the same `traceId` but have different `spanId`s

**Watch out:** Use `process.hrtime.bigint()` for nanosecond precision, not `Date.now()` which has millisecond resolution. High-frequency operations will otherwise show 0ms duration.

---

#### Step 2 - Propagate trace context across async operations

**Goal:** Pass the active trace context through async call chains so child spans are linked to their parent.

**Inputs & outputs:**
- Input: a parent span; async child operations that should appear nested under it
- Output: each child span has a `parentSpanId` pointing to the parent; the complete tree is reconstructable

**Key questions:**
- How do you make the current span available inside async callbacks without passing it explicitly? (Hint: Node.js `AsyncLocalStorage`)
- What is `parentSpanId` and how does it link spans into a tree?
- How do you propagate context across an HTTP boundary? (W3C TraceContext: `traceparent` header)

**Done when:**
- Three nested async operations produce three spans with correct `parentSpanId` linkages
- Reconstructing the tree from flat span data produces the correct hierarchy

**Watch out:** `AsyncLocalStorage` context does not automatically propagate into `EventEmitter` callbacks in all Node.js versions. Use `AsyncResource.bind()` for event listeners that need context.

---

#### Step 3 - Export spans in OTLP/JSON format

**Goal:** Batch completed spans and export them to a trace collector in a standard format.

**Inputs & outputs:**
- Input: completed spans collected in memory
- Output: HTTP POST to a collector endpoint with OTLP-JSON payload; spans visible in Jaeger UI (or logged to stdout as valid OTLP JSON)

**Key questions:**
- What is the OTLP JSON schema for a `ResourceSpans` envelope?
- How do you batch spans - by count, by time interval, or both?
- What should happen to spans collected while the export is in-flight?

**Done when:**
- Spans exported to Jaeger (via its OTLP HTTP endpoint) are visible in the Jaeger UI with correct parent-child relationships
- If Jaeger is unavailable, spans are dropped gracefully (no crash, no retry storm)

**Watch out:** OTLP timestamps are in nanoseconds since Unix epoch as `fixed64` (or string in JSON mode). Sending milliseconds produces traces that appear to have occurred in 1970 in the Jaeger UI.
