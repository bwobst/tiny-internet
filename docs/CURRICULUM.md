# Tiny Internet - Build Path

You are going to build a tiny web platform from scratch and run it across three physical computers.

There is no framework, no cloud platform, no managed database, no CDN, and no observability service hiding underneath it.
You implement the infrastructure yourself, one layer at a time.

At first the system can barely communicate.
By the end it serves a website, distributes traffic across machines, survives a dead backend, caches content, collects metrics and traces, processes events through a queue, and persists data across restarts.

Each layer exists because the system needs it.

**Start here:** [Stage 1 · Naming](./1-networking-fundamentals/1-dns-resolver.md), implemented in Node.js under [`packages/dns/`](../packages/dns/).

Stage files for 2-11 still use old names on disk.
A later session rewrites them to this contract.
Do not treat those files as the locked step lists.

---

## The machines

| Node | Starting role |
|---|---|
| ALPHA | Names and Front door |
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
Do not build the site up front.
Product pages prove an Enables line.
They do not order the path.

| Page | Needs |
|---|---|
| `/` | HTTP |
| `/status` | Metrics |
| `/requests` | Front door |
| `/metrics` | Metrics |
| `/events` | Message queue |
| `/architecture` | Tracing |
| `/lab` | The cluster under stress |

---

## Methodology - Guided Spec

For each stage you receive a **guided spec**, not implementation code: enough to know what to build, why, and how to know it is done.
Design and implementation stay yours.

[Stage 1 · Naming](./1-networking-fundamentals/1-dns-resolver.md) is the exemplar.
Copy its headings.
Do not invent a new format.

### Stage headings

1. `### Stage N · Name`
2. Blockquote: one-sentence stage Goal
3. `**Enables:**` one skip-testable platform fact, present tense, observable on the real machines
4. `**Scope:**` one or two sentences of bound
5. `*Formerly: …*` only when the name changed
6. Steps
7. `**Next:**` one sentence plus a link

Do not add prereqs, time estimates, or stretch sections.

### Step headings

1. `#### Step N - Title`
2. `**Goal:**`
3. `**Shape:**` field list with types only. No example values.
4. `**Key questions:**` may name an RFC. Must not implement it for you.
5. `**Watch out:**`
6. `**Samples:**`
7. `**Done when:**` the Check list. Keep this string so the reader does not move.

Sitting-sized work is a Step.
Use `##### Substep - <name>` only when one Step must stay one Check list but is too big to read as a single block.
A Substep gets a Goal only.

### Samples and Checks

Each Sample is `##### Sample <n> - <short name>`.
One Check per Sample.
The Check bullet uses the Sample's short name.

Behavior Sample: one command fenced, then one exact transcript fenced.
Wire or object Sample: one relative link to a fixture (`.bin` or `.ts`) plus one sentence that names that file as the oracle.
A step may mix kinds.
Never both for the same Check.

A Sample may contain expected bytes, a decoded object, one command, or one transcript.
A Sample must not contain algorithms, control flow, code, a walkthrough of how to produce the transcript, or an RFC section used as a recipe.

### Done and Skip

A **Step** is done when its Samples reproduce on Compose.
A **Stage** is done when its Enables line is true on the real machines.

**Skip:** if a stage's Enables line is already true on the real machines, skip that stage.

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

**Pedagogy that does not Enable `pi.world` is off the path.**
Do not add these as Steps unless a new Enables fact appears: least-connections, presigned URLs, OTLP export, multipart upload, virtual hosts, TLS termination.

---

## [Stage 0 · Network](./0-network/0-network.md)

Three machines that can reach each other, with fixed addresses, SSH access, and a way to run a process on each one.

**Enables:** From ALPHA you can `ssh bravo`, and a process on ALPHA can open a socket to a process on CHARLIE.

---

## Layer 1 · Networking fundamentals

Turn three addressable machines into something that can serve a page.

### [Stage 1 · Naming](./1-networking-fundamentals/1-dns-resolver.md)

**Enables:** `dig pi.world` against ALPHA returns the cluster addresses. Later stages do not hardcode IPs.

### [Stage 2 · Transport](./1-networking-fundamentals/2-tcp-server.md)

**Enables:** ALPHA can send bytes to BRAVO on a connection you accept and get bytes back.

### [Stage 3 · HTTP](./1-networking-fundamentals/3-http-server.md)

**Enables:** `pi.world/` serves a static page from BRAVO.

---

## Layer 2 · Traffic

Make the website a property of the cluster instead of a property of one machine.

### Stage 4 · Front door

**Enables:** `pi.world` has one public entry on ALPHA. You shut BRAVO down. The page says Served by CHARLIE.

No stage file yet.
Old reverse-proxy and load-balancer docs stay on disk until a later rewrite.

---

## Layer 3 · Caching and shared state

Make the system fast, and give it shared state.

### [Stage 5 · HTTP cache](./3-caching-content-delivery/8-http-cache-layer.md)

**Enables:** The site reports a MISS from origin, then a HIT with age and a shorter time.

### [Stage 6 · Key-value store](./3-caching-content-delivery/9-key-value-store.md)

**Enables:** BRAVO and CHARLIE agree on one value after a write from either.

---

## Layer 4 · Observability

Find out what the cluster is doing.

### [Stage 7 · Metrics](./4-reliability-observability/11-metrics-collector.md)

**Enables:** `/metrics` and `/status` show request counts and timings.

### [Stage 8 · Tracing](./4-reliability-observability/12-distributed-tracing.md)

**Enables:** `/architecture` shows a live request path with a duration on each hop.

---

## Layer 5 · Data and storage

Give the system memory.

### [Stage 9 · Write-ahead log](./5-data-storage/13-write-ahead-log.md)

**Enables:** You kill a node during a write, restart it, and the data is intact.

### [Stage 10 · Message queue](./5-data-storage/14-message-queue.md)

**Enables:** `/events` updates without the page waiting for the consumer.

### [Stage 11 · Object storage](./5-data-storage/15-object-storage.md)

**Enables:** A blob is still served after the node that first stored it reboots.

---

## Not on this path

These are not stages on the locked path.
Their files stay until a later rewrite deletes or recuts them.

- API gateway: no product page that needs policy yet
- Content delivery: three nodes in one room do not Enable a CDN
- Circuit breaker: dead-BRAVO failover is the Front door Enables line

---

## Do not design the whole thing first

The stage list above is a direction, not an architecture.

Build the smallest thing that works, then let the next problem force the next piece of infrastructure.
Discovering why a system is built the way it is - by hitting the problem it solves - is the point.

If you reach a stage and its Enables line is already true, skip it.
If the system needs something not on this list, that is a new Enables fact, not a silent extra Step.
