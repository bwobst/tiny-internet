### Stage 13 · Write-ahead log

> Make writes survive a process that dies mid-write.

**In the platform:** This is the stage you validate by hand: start a write, kill the node, bring it back, and check that the data is intact and not half-written. The power cable is the test harness.

**Scope:** durability and recovery for your own store. Understand what `fsync` actually guarantees on your hardware.

*Formerly: Write-Ahead Log.*

**Recommended stack:** Node.js (`fs` with `O_SYNC` or `fsync`)

#### Step 1 - Append entries to a durable log

**Goal:** Write structured log entries to disk in a format that survives process crashes.

**Inputs & outputs:**
- Input: arbitrary operation record `{ type, key, value }`
- Output: entry written to log file with a length prefix and checksum; `fsync` called before returning

**Key questions:**
- What is the on-disk format of an entry? (Length prefix + payload + checksum is conventional)
- Why is `fsync` necessary, and what does it guarantee vs. what does `write` guarantee?
- How do you detect a partially written entry at recovery time?

**Done when:**
- Writing 1000 entries and killing the process mid-write produces a log where all complete entries are intact and the partial entry (if any) is detectable via checksum mismatch

**Watch out:** Node.js `fs.writeFile` does not call `fsync` by default - data may sit in the OS page cache and be lost on crash. Use `fs.open` with `O_SYNC` flag, or call `fs.fsync` explicitly after each write.

---

#### Step 2 - Replay the log for crash recovery

**Goal:** On startup, read the log file sequentially and reconstruct in-memory state by replaying entries.

**Inputs & outputs:**
- Input: existing log file on disk
- Output: in-memory key-value state identical to what it would be if the process had never crashed

**Key questions:**
- How do you handle a corrupted or truncated entry at the end of the log?
- In what order do you replay entries? Is replay idempotent?
- How do you know when you've reached the end of valid entries?

**Done when:**
- Write 500 entries, kill with `kill -9`, restart - in-memory state matches all successfully flushed entries
- A truncated final entry (simulate by truncating the file) is skipped without error

**Watch out:** Replay must apply entries in strict log order. If your in-memory state is not deterministic given the same log, recovery will produce inconsistent results.

---

#### Step 3 - Log compaction

**Goal:** Collapse the full log history into a snapshot, discarding entries superseded by later writes.

**Inputs & outputs:**
- Input: log file with 10,000 entries, many overwriting the same keys
- Output: compacted log (or snapshot file) containing only the latest value per key; old log truncated or replaced

**Key questions:**
- When is it safe to compact? (Not mid-write - you need a quiescent point.)
- Do you compact in place or write a new file and atomically replace?
- How do you ensure the snapshot is complete before deleting the old log? (What if the process crashes mid-compaction?)

**Done when:**
- After 10,000 writes to 100 unique keys, compaction produces a file with exactly 100 entries
- Crash-recovery from the compacted log produces identical state to recovery from the full log
- A crash during compaction does not corrupt either the old or new log

**Watch out:** Write the new compacted file, fsync it, then atomically rename it over the old file. Never truncate the existing log in place - a crash mid-truncation leaves you with no log and no snapshot.
