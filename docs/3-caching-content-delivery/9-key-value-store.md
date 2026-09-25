### Stage 6 · Key-value store

> Give BRAVO and CHARLIE a value they both agree on.

**Enables:** BRAVO and CHARLIE agree on one value after a write from either.

**Scope:** Two Nodes sharing one key space, agreeing after a write to either one. No cluster larger than two, no persistence across restarts, no partition handling beyond deciding which write wins when both Nodes have one.

#### Step 1 - Store and retrieve a value on one Node

**Goal:** Implement an in-memory store on one Node so a value written to a key is readable back from that same Node.

**Shape:**
- Input:
  - write: key: string, value: string
  - read: key: string
- Output:
  - write: acknowledgement
  - read: the value last written for that key, or a marker that the key has never been written

**Key questions:**
- What backs the store so a `write` to a key that already has a value replaces it, rather than keeping both?
- What does a `read` return for a key nobody has written yet, and how is that distinguished from a key written with an empty value?
- The store lives in memory for this stage. What would you have to add for it to survive a restart - and is that this stage's job?

**Watch out:** A plain object used as a map has surprising key behavior - inherited properties can shadow a lookup, and non-string keys get silently coerced to strings. Pick a backing structure where a key you never wrote cannot appear to have a value.

**Samples:**

##### Sample 1 - write color to bravo

```
docker compose exec alpha curl -s -i -X PUT http://bravo:7070/kv/color -d red
```

```
HTTP/1.1 204 No Content
Connection: close

```

##### Sample 2 - read color from bravo

```
docker compose exec alpha curl -s -i http://bravo:7070/kv/color
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 3
Connection: close

red
```

**Done when:**
- write color to bravo
- read color from bravo

---

#### Step 2 - Agree on a value across both Nodes

**Goal:** After a write lands on either BRAVO or CHARLIE, both Nodes answer a `read` for that key with the same value.

**Shape:**
- Input: a write on one Node, followed by a read on the other Node
- Output: the read returns the value from the write, not a stale or missing value

**Key questions:**
- How does a write on BRAVO reach CHARLIE - does BRAVO push it immediately, does CHARLIE pull on an interval, or does CHARLIE ask BRAVO when it doesn't recognize a key?
- If BRAVO and CHARLIE each get a different write to the same key before either has heard from the other, which value survives once they both know about both writes?
- Does the write's acknowledgement to the client come back before or after the peer Node has the update? What does that decision do to a read on the peer that happens right after?

**Watch out:** If a write acknowledges success before the peer actually has it, "write on one Node, read on the other" can flake for a reason that has nothing to do with whether agreement itself works. Decide whether the write blocks until the peer confirms, or whether a read shortly after a write is allowed to retry, and make that decision visible in how the Sample is run.

**Samples:**

##### Sample 3 - write on bravo, read on charlie

```
docker compose exec alpha curl -s -i -X PUT http://bravo:7070/kv/color -d blue && docker compose exec alpha curl -s -i http://charlie:7070/kv/color
```

```
HTTP/1.1 204 No Content
Connection: close

HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 4
Connection: close

blue
```

##### Sample 4 - write on charlie, read on bravo

```
docker compose exec alpha curl -s -i -X PUT http://charlie:7070/kv/color -d green && docker compose exec alpha curl -s -i http://bravo:7070/kv/color
```

```
HTTP/1.1 204 No Content
Connection: close

HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 5
Connection: close

green
```

**Done when:**
- write on bravo, read on charlie
- write on charlie, read on bravo

---

**Next:** BRAVO and CHARLIE agree on a value, but nothing tells you how often either one is asked for it. [Stage 7 · Metrics collector](../4-reliability-observability/11-metrics-collector.md).
