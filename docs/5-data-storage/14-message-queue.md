### Stage 10 · Message queue

> Decouple a request from the work it triggers.

**Enables:** `/events` updates without the page waiting for the consumer.

**Scope:** a broker your own producer and consumer use. Not Kafka, and do not build it on a real broker.

*Formerly: Message Queue.*

#### Step 1 - Publish without waiting for the consumer

**Goal:** `POST /events` enqueues the event and responds before the consumer has processed it.

**Shape:**
- Input: HTTP POST to `/events` with an event body
- Output: HTTP response sent back before the consumer's handler for that event has finished running; the event queued in the order it was received

**Key questions:**
- What does the handler for `POST /events` have to do, and in what order, so the response goes out before the consumer runs?
- If the consumer's work takes an artificially long time, what would make the response slow anyway? What would keep it fast regardless?
- How do you prove "before the consumer finished" from outside the process, using only what `curl` can measure?

**Watch out:** A handler that calls the consumer directly, even wrapped in something that looks asynchronous, can still finish the consumer's work before the response is written if nothing actually decouples the two. Time the response, not the code path.

**Samples:**

##### Sample 1 - fast response despite a slow consumer

```
docker compose exec alpha sh -c "curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' -X POST http://bravo:7070/events -d 'type=click'"
```

```
202 0.009s
```

**Done when:**
- fast response despite a slow consumer

---

#### Step 2 - Consumer drains in order and the record shows up later

**Goal:** The consumer dequeues events in the order they were published and records each one to the store; `GET /events` reflects only the events the consumer has finished with.

**Shape:**
- Input: several `POST /events` calls in sequence, followed by `GET /events` at two different times
- Output: a `GET /events` immediately after publishing may omit an event still in flight; a `GET /events` after the consumer has had time to run lists every published event, in publish order

**Key questions:**
- What does the consumer write to, and does that write need to survive a restart? (Stage 9's log applies to whatever the consumer records into.)
- Two events are published back to back. What guarantees the consumer processes them in that order rather than whichever finishes first?
- Is an event missing from an immediate `GET /events` a bug, or the behavior this stage is testing for?

**Watch out:** Don't "fix" a `GET /events` that briefly omits a just-published event by making the GET wait for the queue to drain. That wait is the exact coupling this stage removes.

**Samples:**

##### Sample 2 - immediate read may lag, later read catches up

```
docker compose exec alpha curl -s -X POST http://bravo:7070/events -d 'type=click'
docker compose exec alpha curl -s http://bravo:7070/events
sleep 1
docker compose exec alpha curl -s http://bravo:7070/events
```

```
202

click
```

**Done when:**
- immediate read may lag, later read catches up

---

**Next:** requests no longer wait on the work they trigger, but a blob still lives on whichever node's disk first received it. [Stage 11 · Object storage](./15-object-storage.md).
