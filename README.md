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
