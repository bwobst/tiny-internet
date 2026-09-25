### Stage 2 · TCP server

> Accept a TCP connection from another node and echo bytes back across it.

**Enables:** ALPHA can send bytes to BRAVO on a connection you accept and get bytes back.

**Scope:** a socket server on BRAVO that accepts a connection and echoes whatever bytes arrive. No framing, no backpressure handling, no application protocol on top.

#### Step 1 - Accept and echo across Nodes

**Goal:** Listen on BRAVO, accept a connection from ALPHA, and echo back whatever bytes arrive.

**Shape:**
- Input: bytes written by a client into an accepted connection
- Output: the same bytes, written back on that same connection

**Key questions:**
- What is the difference between a listening socket and a connection socket, and what has to exist on each side before bytes can flow?
- What does it mean for TCP to be a byte stream - why can't a receiver assume one write on one side arrives as exactly one read on the other?
- Which address does BRAVO bind to so a connection from ALPHA, not just from BRAVO itself, is accepted?

**Watch out:** Compose publishes BRAVO's port to the host on a different number than the port the server binds inside the container. A Sample run from another node's container uses the in-Node port; a Sample run from the laptop uses the published one.

**Samples:**

##### Sample 1 - accept and echo across Nodes

```
docker compose exec alpha sh -c "printf 'hello bravo\n' | nc bravo 3000"
```

```
hello bravo
```

**Done when:**
- accept and echo across Nodes

---

**Next:** bytes cross the network, but nothing above them understands a request yet. [Stage 3 · HTTP server](./3-http-server.md).
