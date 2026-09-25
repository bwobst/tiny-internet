### Stage 12 · Circuit breaker

> Stop sending traffic to a backend that is hurting.

**In the platform:** A slow backend is worse than a dead one - it ties up connections everywhere upstream. The breaker is what lets the platform degrade instead of cascading, and it is what makes `/lab` survivable when you start injecting failure on purpose.

**Scope:** protecting your own calls between your own nodes.


**Recommended stack:** Node.js

#### Step 1 - Closed and open states

**Goal:** Track failures against a threshold; trip to OPEN state and reject calls immediately when exceeded.

**Inputs & outputs:**
- Input: wrapped function calls; some succeed, some throw errors
- Output: calls pass through in CLOSED state; `CircuitOpenError` thrown immediately in OPEN state without calling the wrapped function

**Key questions:**
- What counts as a failure? Any thrown error? Specific error types? Timeouts?
- What is your failure threshold - count, or percentage of recent calls?
- When the breaker trips OPEN, how long should it stay open before attempting recovery?

**Done when:**
- After 5 consecutive failures, all subsequent calls throw `CircuitOpenError` without hitting the wrapped function
- A manual call count confirms zero calls to the wrapped function while OPEN

**Watch out:** Count *consecutive* failures, not total failures, unless you're implementing a sliding-window approach. A single success resetting a 4-failure count is typically the right behavior.

---

#### Step 2 - Half-open state and recovery

**Goal:** After a timeout, allow a single test call through; recover to CLOSED on success, re-trip on failure.

**Inputs & outputs:**
- Input: OPEN circuit after timeout elapses
- Output: exactly one call passes through in HALF-OPEN; success → CLOSED (counters reset); failure → back to OPEN

**Key questions:**
- How do you prevent multiple concurrent callers from all passing through in HALF-OPEN?
- What is the correct sequence of state transitions: CLOSED → OPEN → HALF-OPEN → CLOSED?
- Should you reset the failure counter on transition to HALF-OPEN, or only on transition to CLOSED?

**Done when:**
- After the open timeout, exactly one call reaches the wrapped function
- A second concurrent call during HALF-OPEN receives `CircuitOpenError`
- A successful probe transitions to CLOSED and subsequent calls all pass through

**Watch out:** Without a guard, 20 concurrent requests arriving during HALF-OPEN will all be let through at once, defeating the purpose. Use a flag (e.g. `probeSent`) to allow only the first.

---

#### Step 3 - Metrics and observability

**Goal:** Track state transitions and call outcomes; expose them for external monitoring.

**Inputs & outputs:**
- Input: any call passing through the breaker
- Output: `{ state, totalCalls, successCount, failureCount, rejectedCount, lastStateChange }` from a `stats()` method

**Key questions:**
- Should stats be per-instance or global?
- How do you emit state change events so external systems can react (e.g. alert on trip)?
- What is a rolling window for counting failures, and why is it more useful than a total count?

**Done when:**
- `stats()` returns accurate counts after 100 mixed success/failure calls
- An `EventEmitter`-style `on('stateChange', handler)` fires on every CLOSED↔OPEN transition
- Stats reset correctly when the circuit recovers to CLOSED

**Watch out:** `rejectedCount` (calls blocked by an OPEN circuit) is a separate metric from `failureCount` (calls that reached the wrapped function and threw). Mixing them makes dashboards misleading.
