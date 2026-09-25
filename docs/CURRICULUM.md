# Tiny Internet - Build Path

You are going to build a tiny web platform from scratch and run it across three physical computers.

There is no framework, no cloud platform, no managed database, no CDN, and no observability service hiding underneath it.
You implement the infrastructure yourself, one layer at a time.

At first the system can barely communicate.
By the end it serves a website, distributes traffic across machines, survives a dead backend, caches content, collects metrics and traces, processes events through a queue, and persists data across restarts.

**Start here:** [Stage 0 · Network](./0-network/0-network.md).
Then [Stage 1 · DNS resolver](./1-networking-fundamentals/1-dns-resolver.md), implemented in Node.js under [`packages/dns-resolver/`](../packages/dns-resolver/).

---

## The machines

| Node | Starting role |
|---|---|
| ALPHA | DNS and Load balancer |
| BRAVO | Web backend |
| CHARLIE | Web backend |

Roles are a starting point.
Any node must eventually be allowed to disappear without taking the website with it.

The nodes do not have to be Raspberry Pis.
They have to be separate machines on a real network, where pulling a power cable is a valid test.

---

## The product

The platform serves `pi.world`, a site about the platform itself.

The site grows with the infrastructure.

| Page | Needs |
|---|---|
| `/` | HTTP server |
| `/status` | Metrics collector |
| `/requests` | Load balancer |
| `/metrics` | Metrics collector |
| `/events` | Message queue |
| `/architecture` | Distributed tracing |
| `/lab` | Controls to break a node or delay a hop, then watch the rest of the site |

---

## How the specs work

Each stage is a **guided spec**.
It tells you what to build, which questions to answer first, and how you know you are done.

[Stage 1 · DNS resolver](./1-networking-fundamentals/1-dns-resolver.md) shows the shape.

A stage file has:

- **Goal** - one fact you can check on the real machines. The stage is done when that fact is true. If it is already true, skip the stage.
- **Scope** - the bound. Stop when the Goal is true.
- **Read** - one primer for the stage, and one primer for each step. Open it when the Goal is clear and the mechanism is not. The page teaches the idea. It is not a solution of the step.
- **Steps** - sitting-sized work. A step is done when its Samples reproduce. A command Sample reproduces on Compose. A fixture Sample reproduces when a test matches the fixture pair.
- **Key questions** - answer these before you write code.
- **Samples** - one command and its transcript, or a link to a fixture. That output is the oracle. It is not a recipe. A fixture file exports `wire` (bytes) and `decoded` (object). The `.bin` file is the same bytes as `wire`.

Compose is for command Samples.
The Goal is for ALPHA, BRAVO, and CHARLIE.

---

## Rules

**Write the code by hand.** That is the point of the project.

**Do not use a library to solve the thing this stage is meant to teach.**
OS primitives are fine: sockets, filesystem, processes, threads, timers.
Express is not an HTTP server you built.
Redis is not a key-value store you built.

**Keep scope bounded.** You are not recreating production systems.
You are understanding one deeply enough to build a small working version and watch it behave in a real environment.

**Let failure be real.** Physical failure is part of the project, not something to mock away.

**Stay on the current Goal.** If a feature does not make that Goal true on the machines, leave it out.

---

## [Stage 0 · Network](./0-network/0-network.md)

Three machines that can reach each other, with fixed addresses, SSH access, and a way to run a process on each one.

**Goal:** From ALPHA, `ssh bravo hostname` prints `bravo`.
From ALPHA, `nc charlie 9000` delivers `hello from alpha` to a listener on CHARLIE.

---

## Layer 1 · Networking fundamentals

Turn three addressable machines into something that can serve a page.

### [Stage 1 · DNS resolver](./1-networking-fundamentals/1-dns-resolver.md)

**Goal:** `dig pi.world` against ALPHA returns the cluster addresses.
Later stages look up names instead of hardcoding IPs.

### [Stage 2 · TCP server](./1-networking-fundamentals/2-tcp-server.md)

**Goal:** ALPHA can send bytes to BRAVO on a connection you accept and get bytes back.

### [Stage 3 · HTTP server](./1-networking-fundamentals/3-http-server.md)

**Goal:** `pi.world/` serves a static page from BRAVO.

---

## Layer 2 · Traffic

Make the website a property of the cluster instead of a property of one machine.

### [Stage 4 · Load balancer](./2-traffic-routing/4-load-balancer.md)

**Goal:** `pi.world` has one public entry on ALPHA.
You shut BRAVO down.
The page says Served by CHARLIE.

---

## Layer 3 · Caching and shared state

Make the system fast, and give it shared state.

### [Stage 5 · HTTP cache](./3-caching-content-delivery/8-http-cache-layer.md)

**Goal:** The first GET of `/` reports a MISS from origin.
The second reports a HIT with an Age header and a shorter time.

Without a cache, every request pays origin work on BRAVO or CHARLIE.
Repeat views should be cheap at the load balancer.

### [Stage 6 · Key-value store](./3-caching-content-delivery/9-key-value-store.md)

**Goal:** You SET a key on BRAVO and GET the same value from CHARLIE.

Each backend otherwise keeps its own memory.
A write on one node has to show up on the other, or sessions and counters depend on which machine you hit.

---

## Layer 4 · Observability

Find out what the cluster is doing.

### [Stage 7 · Metrics collector](./4-reliability-observability/11-metrics-collector.md)

**Goal:** `/metrics` and `/status` show request counts and timings.

### [Stage 8 · Distributed tracing](./4-reliability-observability/12-distributed-tracing.md)

**Goal:** `/architecture` shows a live request path with a duration on each hop.

---

## Layer 5 · Data and storage

Give the system memory.

### [Stage 9 · Write-ahead log](./5-data-storage/13-write-ahead-log.md)

**Goal:** You kill a node during a write, restart it, and the data is intact.

### [Stage 10 · Message queue](./5-data-storage/14-message-queue.md)

**Goal:** A request that records an event returns before the worker finishes.
`/events` then shows the processed event.

The HTTP process should not wait on slow work.
The queue is the handoff so the page can update later.

### [Stage 11 · Object storage](./5-data-storage/15-object-storage.md)

**Goal:** You PUT a blob, reboot the node that stored it, and GET still returns the bytes.

Bytes in RAM or in a tmp directory die with the process.
Object storage is how uploads survive a reboot.
