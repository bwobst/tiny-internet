### Stage 9 · Write-ahead log

> Make a write to the store survive a Node that dies right after acknowledging it.

**Enables:** You kill a node during a write, restart it, and the data is intact.

**Scope:** Durability and recovery for the Stage 6 key-value store on one Node. Understand what `fsync` actually guarantees on your hardware. No compaction, no changes to how BRAVO and CHARLIE agree with each other.

#### Step 1 - Log a write before acknowledging it

**Goal:** Append each write to an on-disk log and `fsync` it before the store acknowledges the write, then rebuild in-memory state from that log on startup.

**Shape:**
- Input: write: key: string, value: string, arriving at the Stage 6 key-value store on one Node
- Output: an entry appended to a log file on disk, `fsync`'d, before the write's HTTP response is sent; on startup, in-memory state rebuilt by reading the log in order

**Key questions:**
- `fs.write` (or `fs.appendFile`) returning does not mean the bytes are on disk. What call forces them there, and what does that guarantee compared to what `write` alone guaranteed?
- What shape do you give an entry on disk so a later reader can tell where one entry ends and the next begins?
- Two writes to the same key both appear in the log. Which one does startup replay leave in memory, and why does the answer depend on log order rather than write order in general?

**Watch out:** If you send the HTTP response before `fsync` returns, an acknowledged write has no actual durability guarantee - Step 2's kill test will find it missing.

**Samples:**

##### Sample 1 - write survives a restart

```
docker compose exec alpha curl -s -i -X PUT http://bravo:7070/kv/color -d red
docker compose restart bravo
docker compose exec alpha curl -s -i http://bravo:7070/kv/color
```

```
HTTP/1.1 204 No Content
Connection: close

HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 3
Connection: close

red
```

**Done when:**
- write survives a restart

---

#### Step 2 - Kill the Node mid-write, restart it, and find the data intact

**Goal:** Confirm the data is intact after a hard kill and restart, whether the kill lands right after a write is acknowledged or while a write is still in flight through the log.

**Shape:**
- Input: a Node killed with `kill -9` (or Compose's equivalent) while handling a write, followed by a restart of the same Node
- Output: a read on the restarted Node returns the correct value for every write that was acknowledged before the kill, and the Node starts up without treating the log as corrupt

**Key questions:**
- `kill -9` gives the process no chance to run any shutdown code. What has to already be true on disk, by the time a write's HTTP response was sent, for that write to survive this?
- If the kill lands mid-append, rather than between two separate writes, what does the log end in, and how does startup tell that apart from a complete entry?
- Does a half-written entry at the end of the log stop the rest of the log from replaying correctly?

**Watch out:** A kill timed right after a response is easy to pass and easy to mistake for the real test. The write this stage is named for is one the kill catches mid-append, not one that already finished.

**Samples:**

##### Sample 2 - kill right after an acknowledged write, restart, and read

```
docker compose exec alpha curl -s -i -X PUT http://bravo:7070/kv/color -d green
docker compose kill -s SIGKILL bravo
docker compose up -d bravo
docker compose exec alpha curl -s -i http://bravo:7070/kv/color
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

##### Sample 3 - kill while a different write is still in flight, restart, and read what was already durable

```
docker compose exec -d alpha sh -c "curl -s -o /dev/null -X PUT http://bravo:7070/kv/big --data-binary @/tmp/5mb.bin"
docker compose kill -s SIGKILL bravo
docker compose up -d bravo
docker compose exec alpha curl -s -i http://bravo:7070/kv/color
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 5
Connection: close

green
```

**Done when:**
- kill right after an acknowledged write, restart, and read
- kill while a different write is still in flight, restart, and read what was already durable

---

**Next:** the Node's own data survives a crash, but nothing yet decouples a request from the work it triggers. [Stage 10 · Message queue](./14-message-queue.md).
