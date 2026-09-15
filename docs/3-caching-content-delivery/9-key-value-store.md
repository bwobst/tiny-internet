### Stage 9 · Key-value store

> Build the storage engine the cache and the app both need.

**In the platform:** Per-node memory stops being enough once BRAVO and CHARLIE need to agree on something - a visitor count, a session, a cached object. This is the platform's first shared state.

**Scope:** a store your own services can depend on. Not Redis. Do not use Redis to build it.

*Formerly: Key-Value Store.*

**Recommended stack:** Node.js

#### Step 1 - Core get/set/delete operations

**Goal:** Implement a simple in-memory key-value store with string keys and arbitrary value types.

**Inputs & outputs:**
- Input: `set(key, value)`, `get(key)`, `delete(key)` calls
- Output: stored/retrieved values; `null` for missing keys; `true`/`false` for delete

**Key questions:**
- What data structure backs the store? Plain object, `Map`, or something else?
- What value types will you support - strings only, or arbitrary serializable values?
- What is the return value of `get` on a missing key vs. a key explicitly set to `null`?

**Done when:**
- 10,000 sequential set/get/delete operations complete without errors
- `get` on a deleted key returns `null`, not the previous value
- Keys with identical content but different types (e.g. `1` vs `"1"`) are handled predictably

**Watch out:** JavaScript object keys are always strings. If you use a plain object as your backing store, the integer key `1` and the string key `"1"` collide. Use `Map` to avoid this.

---

#### Step 2 - TTL expiry

**Goal:** Allow keys to be set with an expiry time; return `null` for expired keys and clean them up.

**Inputs & outputs:**
- Input: `set(key, value, ttlSeconds)`
- Output: `get` returns the value until TTL expires; returns `null` afterward

**Key questions:**
- Do you use `setTimeout` per key, a periodic sweep, or lazy expiry on `get`?
- What are the memory trade-offs of each approach?
- What happens to a key's TTL if you `set` it again without a TTL argument?

**Done when:**
- `set("x", 1, 1)` followed by a 1.1-second wait causes `get("x")` to return `null`
- `set("x", 2)` after expiry correctly stores the new value without TTL
- 10,000 expired keys are eventually cleaned from memory (verify with `process.memoryUsage()`)

**Watch out:** One `setTimeout` per key sounds simple but creates memory pressure under high write volume. A lazy expiry check on `get` + periodic sweep is typically more efficient. Know the trade-off.

---

#### Step 3 - LRU eviction

**Goal:** Enforce a maximum capacity; when full, evict the least recently used key.

**Inputs & outputs:**
- Input: `new KVStore({ maxSize: N })`; `set` calls beyond capacity
- Output: the LRU key is evicted automatically; recently accessed keys survive eviction

**Key questions:**
- What data structure gives O(1) get/set/evict? (Hint: doubly linked list + hash map)
- Does a `get` access count as "recently used"?
- What happens when you `set` an existing key - does it move to the front?

**Done when:**
- With `maxSize: 3`, setting a 4th key evicts the least-recently-used (not the least-recently-set) key
- A `get` access promotes a key so it is not the next to be evicted
- All operations remain O(1) - verified by timing 100,000 operations against 1000 operations and confirming linear (not quadratic) scaling

**Watch out:** JavaScript's `Map` preserves insertion order, which you can exploit to fake an LRU - but only if you delete and re-insert on every access. That's a valid approach, but understand its cost vs. a true doubly linked list implementation.
