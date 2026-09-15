# Tiny Internet - Build Path

You are going to build a tiny web platform from scratch and run it across three physical computers.

There is no framework, no cloud platform, no managed database, no CDN, and no observability service hiding underneath it.
You implement the infrastructure yourself, one layer at a time.

At first the system can barely communicate.
By the end it serves a website, distributes traffic across machines, survives node failures, caches content, collects metrics and traces, processes events through a queue, and persists data across restarts.

Each layer exists because the system needs it.

**Start here:** [Stage 1 · Naming](./1-networking-fundamentals/1-dns-resolver.md), implemented in Node.js under [`packages/dns/`](../packages/dns/).

---

## The machines

| Node | Starting role |
|---|---|
| ALPHA | Names and front door: DNS, then proxy and load balancer |
| BRAVO | Web backend: HTTP server, then cache |
| CHARLIE | Web backend: HTTP server, then cache |

Roles are a starting point.
Any node must eventually be allowed to disappear without taking the website with it.

The nodes do not have to be Raspberry Pis.
They have to be separate machines on a real network, where pulling a power cable is a valid test.

---

## The product

The platform serves `pi.world`, a site about the platform itself.

The site grows with the infrastructure.
Do not build the site up front.
Each stage below unlocks the next thing the site can honestly show.

| Page | Needs |
|---|---|
| `/` | HTTP server |
| `/status` | Metrics, health checks |
| `/requests` | Load balancer, request logging |
| `/metrics` | Metrics collector |
| `/events` | Message queue |
| `/architecture` | Tracing |
| `/lab` | Everything, plus nerve |

---

## Methodology - Guided Spec

For each stage, you receive a **guided spec** rather than implementation code: enough detail to know what to build and how to verify it, but the design and implementation decisions belong to you.

Each build step includes:

- **Goal** - what this step accomplishes in one sentence
- **Inputs & outputs** - data shapes, not code
- **Key questions** - things to answer before writing a line
- **Done when** - a checklist verifiable with a real tool or console output
- **Watch out** - the one thing that most commonly trips people up

Each stage also answers one question: **what does this component enable in the platform?**
If a component does not enable anything, it does not belong in the build path yet.

When you get stuck on a specific bug, concept, or decision between approaches, bring it to Claude and work through it together.
Implementation code is not volunteered unprompted.

---

## Rules

**Write the code by hand.** That is the point of the project.

**Do not use a library to solve the thing this stage is meant to teach.**
OS primitives are fine: sockets, filesystem, processes, threads, timers.
Express is not an HTTP server you built. Redis is not a key-value store you built.

**Keep scope bounded.** You are not recreating production systems.
You are understanding one deeply enough to build a small working version and watch it behave in a real environment.

**Let failure be real.** Physical failure is part of the project, not something to mock away.

---

## Stage 0 - Network

Three machines that can reach each other, with fixed addresses, SSH access, and a way to run a process on each one.

**Enables:** everything.

**Done when:** you can `ssh bravo` from ALPHA, and a process on ALPHA can open a socket to a process on CHARLIE.

---

## Layer 1 - Networking Fundamentals

Turn three addressable machines into something that can serve a page.

### [Stage 1 · Naming](./1-networking-fundamentals/1-dns-resolver.md)

Build the naming system for your tiny internet.

**Enables:** `pi.world`, `alpha.pi.world`, `bravo.pi.world`, `charlie.pi.world`. Nothing later has to hardcode an IP address.

### [Stage 2 · Transport](./1-networking-fundamentals/2-tcp-server.md)

Build the transport mechanism that lets the machines communicate.

**Enables:** every service above this line. Connections, backpressure, and the failure modes you will spend the rest of the project handling.

### [Stage 3 · HTTP](./1-networking-fundamentals/3-http-server.md)

Build the first thing a person can see.

**Enables:** `pi.world/` serves a static page from BRAVO. The project becomes visible to someone who is not you.

---

## Layer 2 - Traffic & Routing

Make the website a property of the cluster instead of a property of one machine.

### [Stage 4 · Reverse proxy](./2-traffic-routing/5-reverse-proxy.md)

Put something in front of the backends.

**Enables:** one public entry point on ALPHA. Backends stop being directly addressable.

### [Stage 5 · Load balancing](./2-traffic-routing/4-load-balancer.md)

Spread traffic across BRAVO and CHARLIE, and notice when one stops answering.

**Enables:** the defining moment. The page says `Served by BRAVO`. You shut BRAVO down. The page says `Served by CHARLIE`.

### [Stage 6 · API gateway](./2-traffic-routing/6-api-gateway.md)

Give the front door policy: routing rules, rate limits, auth boundaries.

**Enables:** `/api/*` on the site can be treated differently from static pages.

---

## Layer 3 - Caching & Content Delivery

Make the system fast, and make its speed observable.

### [Stage 7 · HTTP cache layer](./3-caching-content-delivery/8-http-cache-layer.md)

Cache expensive responses at the edge.

**Enables:** the site reports its own cache behavior - `MISS origin: bravo 42ms`, then `HIT age: 1.2s 0.7ms`.

### [Stage 8 · Content delivery](./3-caching-content-delivery/7-cdn.md)

Treat the three nodes as content locations and decide where content lives.

**Enables:** experiments with placement, invalidation, and what "close to the user" means when the user is in the next room.

### [Stage 9 · Key-value store](./3-caching-content-delivery/9-key-value-store.md)

Build the storage engine the cache and the app both need.

**Enables:** shared state across nodes instead of per-node memory.

---

## Layer 4 - Reliability & Observability

Find out what your tiny internet is actually doing, then make it survive.

### [Stage 10 · Metrics collector](./4-reliability-observability/11-metrics-collector.md)

Count and time everything.

**Enables:** `/metrics` and `/status`. `http_requests_total`, `http_request_duration_ms`, `cache_hits_total`, `active_connections`.

### [Stage 11 · Distributed tracing](./4-reliability-observability/12-distributed-tracing.md)

Follow one request across every machine it touched.

**Enables:** `/architecture` shows a live request path - DNS, proxy, cache, backend, storage, with a duration on each hop.

### [Stage 12 · Circuit breaker](./4-reliability-observability/10-circuit-breaker.md)

Stop sending traffic to a backend that is hurting.

**Enables:** degraded-but-alive behavior instead of cascading failure. Makes `/lab` survivable.

---

## Layer 5 - Data & Storage

Give the system memory.

### [Stage 13 · Write-ahead log](./5-data-storage/13-write-ahead-log.md)

Make writes survive a process that dies mid-write.

**Enables:** kill a node during a write, restart it, verify the data is intact.

### [Stage 14 · Message queue](./5-data-storage/14-message-queue.md)

Decouple request handling from request processing.

**Enables:** `/events`. HTTP request goes to a queue, an analytics consumer drains it, the database records it, and none of that slows down the page.

### [Stage 15 · Object storage](./5-data-storage/15-object-storage.md)

Store the blobs the site serves.

**Enables:** static assets and uploads that live in the cluster rather than on one node's disk.

---

## Do not design the whole thing first

The stage list above is a direction, not an architecture.

Build the smallest thing that works, then let the next problem force the next piece of infrastructure.
Discovering *why* a system is built the way it is - by hitting the problem it solves - is the point.

If you reach a stage and the system does not yet need it, skip it.
If the system needs something not on this list, build that instead.
