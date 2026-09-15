# Tiny Internet

Build and operate a tiny web platform from scratch on three Raspberry Pis.

No framework, no cloud platform, no managed database, no CDN, no observability vendor.
The naming, the transport, the routing, the caching, the metrics, the queue, the storage - you write all of it by hand.

At first the machines can barely talk to each other.
By the end they serve a real website at `pi.world`, spread traffic across nodes, survive a node you physically shut down, cache what is expensive, report what they are doing, and remember things across restarts.

Each layer exists because the system needs it.

See [docs/CURRICULUM.md](./docs/CURRICULUM.md) for the build path and [AGENTS.md](./AGENTS.md) for how to work with an AI tutor on this repo.

## The system

Three machines, named ALPHA, BRAVO, and CHARLIE.
A starting topology, not a final design:

```text
        Laptop browser
              |
              v
        DNS  (ALPHA)
              |
              v
   Load balancer / proxy  (ALPHA)
          /         \
         v           v
      BRAVO       CHARLIE
   HTTP + cache  HTTP + cache
          \         /
              v
     Queue / KV / storage
```

The topology above is where the system starts.
It is not a blueprint to implement top-down.
Build the smallest thing that works, then let the next problem force the next piece of infrastructure.

## The website

The platform serves a site about itself: `pi.world`.

The site is the reason the infrastructure exists, and it grows as the infrastructure grows.
A static page comes first.
`/status`, `/requests`, `/metrics`, `/events`, and `/architecture` each become possible only after the layer that feeds them exists.

The defining moment of the project is not a passing test.
It is this:

```text
$ curl pi.world            ->  Served by BRAVO
$ ssh bravo sudo shutdown now
$ curl pi.world            ->  Served by CHARLIE
```

## Rules

**Write the code by hand.** This project exists to keep implementation skill sharp. Do not delegate the implementation.

**Do not use a library to solve the thing you are trying to learn.**
OS primitives are fine: TCP sockets, the filesystem, processes, threads, timers.
Normal language facilities are fine where they are not the subject.
But no Express for the HTTP server, no Redis for the key-value store, no Prometheus for the metrics collector, no broker for the message queue.

**Keep scope bounded.** The goal is not a production DNS server. The goal is a DNS server good enough to name the machines in your house, and deep enough understanding to know what a real one does differently.

**Let failure be real.** Do not mock a dead node. Unplug it.

## Local development

The three nodes are Raspberry Pis.
For day-to-day building you do not want to deploy to hardware on every edit, so `compose.yaml` runs ALPHA, BRAVO, and CHARLIE as three containers on one bridge network.

This is for convenience while building.
It is not where the project is finished.
A container stop is clean and instant; a dead Pi is slow, partial, and sometimes still half-answering.
Prove the system on the hardware.

```bash
docker compose up --detach        # start the three nodes
docker compose exec alpha pnpm install   # first time only
docker compose ps                 # see what is running
docker compose down               # stop them
```

The repo is mounted into every node, so an edit on the laptop is live in the container with no rebuild.

### The nodes

| Node | Address | Role | From the laptop |
| --- | --- | --- | --- |
| ALPHA | `10.53.0.10` | Names and front door | `127.0.0.1:5354` DNS, `127.0.0.1:8080` HTTP |
| BRAVO | `10.53.0.11` | Web backend | `127.0.0.1:8081` HTTP, `127.0.0.1:3001` TCP |
| CHARLIE | `10.53.0.12` | Web backend | `127.0.0.1:8082` HTTP, `127.0.0.1:3002` TCP |

Addresses are fixed, so your zone data can hold real A records.
Each node also resolves the others by name, so `curl http://bravo/` works from ALPHA.
Every node gets `ALPHA_ADDRESS`, `BRAVO_ADDRESS`, `CHARLIE_ADDRESS`, and `ZONE` in its environment.

The containers start with no service of their own and stay up.
Run what you are building by hand while you build it:

```bash
docker compose exec alpha pnpm exec tsx packages/dns/src/query.ts
docker compose exec bravo sh          # a shell on a node
```

`dig`, `nc`, `telnet`, `curl`, `tcpdump`, and `ping` are installed on every node for checking your own work from inside the network.

### Port 53

Containers run as an unprivileged user, the same as a service on the Pi should.
`node` carries `cap_net_bind_service`, so it binds port 53 without root - one of the answers Stage 1 asks you to choose between.

ALPHA publishes DNS on `5354`, not `5353`: `5353` is mDNS, and a macOS host already has it bound, which silently eats the replies.

```bash
dig @127.0.0.1 -p 5354 bravo.pi.world
```

### Killing a node

```bash
docker compose stop bravo     # BRAVO is gone
docker compose start bravo    # BRAVO is back
```

Good enough to develop failover against.
Not a substitute for pulling the cable.

## Monorepo

This repo is a [pnpm](https://pnpm.io) workspace. Each package under `packages/*` is a TypeScript 6 project (`target` ES2025). Scripts run via [tsx](https://github.com/privatenumber/tsx) (no compile step).

| Package | Path            | Role in the system                         |
| ------- | --------------- | ------------------------------------------ |
| `@dns`  | `packages/dns/` | Naming. Wire format, capture scripts, resolver |

### Commands

```bash
pnpm install          # install all workspace dependencies
pnpm lint             # lint and format check (Biome)
pnpm lint:fix         # apply safe lint and format fixes
pnpm typecheck        # typecheck every package
pnpm check            # lint + typecheck
pnpm test             # run all package tests (Vitest)
pnpm test:coverage    # run tests with coverage report
pnpm test:watch       # re-run tests on change
```

### @dns scripts

```bash
pnpm exec tsx packages/dns/src/wire-format-parser/index.ts
```

Requires **Node 26** (see `engines` in root `package.json`). Use [fnm](https://github.com/Schniz/fnm) or similar: `fnm use 26`.

### Adding a package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, and `src/`.
2. Set `"name": "@<scope>/<name>"` (or your chosen scope).
3. Add scripts with `tsx src/scripts/<name>.ts`.
