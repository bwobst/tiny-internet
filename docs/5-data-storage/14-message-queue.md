### Stage 14 · Message queue

> Decouple request handling from request processing.

**In the platform:** `/events` is backed by this. An HTTP request drops an event on a queue, a consumer drains it, the store records it - and none of that work happens while the visitor is waiting for the page.

**Scope:** a broker your own producers and consumers use. Not Kafka, and do not build it on a real broker.

*Formerly: Message Queue.*

**Recommended stack:** Node.js

#### Step 1 - Basic publish and consume

**Goal:** Implement a queue where producers enqueue messages and consumers dequeue them in FIFO order.

**Inputs & outputs:**
- Input: `queue.publish({ topic, payload })`; `queue.consume(topic, handler)`
- Output: messages delivered to the handler in publish order; each message delivered to at most one consumer

**Key questions:**
- What data structure backs the queue? Array, linked list, or something else?
- With multiple consumers on the same topic, how do you ensure each message goes to exactly one?
- What happens if no consumer is registered when a message is published?

**Done when:**
- 1000 messages published to 3 competing consumers are each delivered exactly once (verified by summing consumer counts)
- Messages arrive at consumers in the order they were published

**Watch out:** If you call handlers synchronously within `publish`, a slow handler blocks the publisher. Deliver messages asynchronously (e.g. `setImmediate`) to decouple producer and consumer timing.

---

#### Step 2 - Acknowledgement and redelivery

**Goal:** Hold messages in an "in-flight" state until the consumer explicitly acknowledges them; redeliver if no ack arrives within a timeout.

**Inputs & outputs:**
- Input: `ack(messageId)` or `nack(messageId)` from consumer
- Output: acked messages removed from the queue; nacked messages returned to the head of the queue for redelivery

**Key questions:**
- How do you track which messages are in-flight and their delivery timestamps?
- What is your redelivery timeout, and how do you implement it without polling too frequently?
- What happens if a consumer dies without acking? How does the message get back?

**Done when:**
- A consumer that receives a message but never acks causes the message to be redelivered after the timeout
- `nack` immediately returns the message to the queue for the next available consumer
- `ack` removes the message permanently - no redelivery

**Watch out:** Redelivered messages must be marked with an `attempt` count. Without it, you can't distinguish a first delivery from a 50th, and you'll never know when to give up.

---

#### Step 3 - Dead-letter queue

**Goal:** After N failed delivery attempts, route a message to a dead-letter queue instead of retrying indefinitely.

**Inputs & outputs:**
- Input: a message that has been nacked (or not acked) more than `maxAttempts` times
- Output: message moved to `<topic>.dlq` with metadata: `{ originalTopic, attemptCount, lastFailureReason, firstPublishedAt }`

**Key questions:**
- What triggers DLQ routing - exceeding max attempts, or explicit `nack` with a `reason`?
- Who consumes the DLQ, and what can they do with messages there?
- Should DLQ messages themselves be acked/nacked, or are they terminal?

**Done when:**
- A message nacked 3 times (with `maxAttempts: 3`) appears in the DLQ with correct metadata
- The original topic's queue is empty after DLQ routing
- A DLQ consumer can inspect and optionally replay messages to the original topic

**Watch out:** Don't route to the DLQ on the first nack. Give messages a fair number of attempts before giving up - set `maxAttempts` to at least 3 in your default config and make it configurable.
