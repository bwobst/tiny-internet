### Stage 2 · Transport

> Build the transport mechanism that lets the machines communicate.

**In the platform:** Every service above this line rides on it. The connection lifecycle, framing, and backpressure you work out here are the same failure modes you will be handling for the rest of the project.

**Scope:** a socket server you can reason about and build a protocol on top of. You are using the OS TCP stack, not writing one.

*Formerly: TCP Server.*

**Recommended stack:** Node.js (`net` module)

#### Step 1 - Accept connections and echo data

**Goal:** Open a TCP socket, accept client connections, and echo back whatever bytes arrive.

**Inputs & outputs:**
- Input: raw bytes from a `telnet` or `nc` client
- Output: the same bytes written back to the same socket

**Key questions:**
- What is the difference between a listening socket and a connection socket?
- What events does a `net.Server` and a `net.Socket` emit in Node.js?
- What does it mean for TCP to be a *stream* protocol - why can't you assume each `data` event is one "message"?

**Done when:**
- `echo "hello" | nc localhost 3000` prints `hello` back
- Multiple simultaneous `nc` sessions each get their own echo (connections are isolated)

**Watch out:** TCP is a byte stream. A single `write("hello world")` from the client may arrive as two separate `data` events: `"hello "` and `"world"`. Never treat one event as one message.

---

#### Step 2 - Implement a length-prefixed framing protocol

**Goal:** Define an application-level message boundary so you can send and receive complete messages reliably.

**Inputs & outputs:**
- Input: a message string from the client, prefixed with a 4-byte big-endian length header
- Output: the parsed message string (no length prefix) logged on the server; echoed back with a new length prefix

**Key questions:**
- How do you handle the case where a `data` event delivers only part of a length header?
- Where do you store the incomplete buffer across events?
- How many bytes should you wait for before attempting to parse a message?

**Done when:**
- Sending a 1 MB message arrives as exactly one complete parsed message, regardless of how TCP fragments it
- Your test client can send 1000 messages sequentially and the server processes all 1000 in order

**Watch out:** Buffer the incoming bytes in a per-connection accumulator. A common mistake is using a module-level buffer that gets mixed between connections.

---

#### Step 3 - Handle connection lifecycle and backpressure

**Goal:** Gracefully handle slow clients, half-closes, and connection errors without crashing.

**Inputs & outputs:**
- Input: a client that connects, sends some data, then closes - or drops without closing
- Output: clean resource cleanup; no lingering connections; no memory leaks

**Key questions:**
- What is the difference between `end` (half-close) and `destroy` (hard close)?
- How does `socket.write()` signal backpressure, and what should you do if it returns `false`?
- How do you detect a connection that has gone silent without sending a FIN?

**Done when:**
- After 100 connect/disconnect cycles, your server's open connection count returns to 0
- A client that stops reading (blocked consumer) causes the server to pause sending, not crash
- A `socket.setTimeout()` correctly closes an idle connection after N seconds

**Watch out:** Forgetting to handle the `error` event on a socket will crash the process with an unhandled exception when a client resets the connection (RST packet).
