# Tiny Internet

A tiny web platform built from scratch on three Raspberry Pis.

No framework, no cloud platform, no managed database, no CDN.

See [docs/CURRICULUM.md](./docs/CURRICULUM.md) for the build path and [AGENTS.md](./AGENTS.md) for how to work with an AI tutor on this repo.

## The system

Three machines, named ALPHA, BRAVO, and CHARLIE.
The starting topology:

```text
           Browser
              |
              v
        DNS (ALPHA)
              |
              v
   Load balancer / proxy (ALPHA)
          /         \
         v           v
      BRAVO       CHARLIE
   HTTP + cache  HTTP + cache
            \   /
              v
     Queue / KV / storage
```

## The website

The platform serves a site about itself: `pi.world`.

The site is the reason the infrastructure exists. New features are added to it as the platform gets new capabilities.
A static page comes first.
`/status`, `/requests`, `/metrics`, `/events`, and `/architecture` each become possible as new capabilities are added.

The defining moment of the project is not a passing test.
It is this:

```text
$ curl pi.world            ->  Served by BRAVO
$ ssh bravo sudo shutdown now
$ curl pi.world            ->  Served by CHARLIE
```

## Rules

**Write the code by hand.** This project exists to keep implementation skill sharp. Do not delegate the implementation.

**Do not use a library to trivialize the problem.**
OS primitives are fine: TCP sockets, the filesystem, processes, threads, timers.
Normal language primitives are fine where they are not the subject.
But no Express for the HTTP server, no Redis for the key-value store, no Prometheus for the metrics collector, no broker for the message queue.

## Local development

The three nodes are Raspberry Pis.
Local development is done via Docker Compose which runs ALPHA, BRAVO, and CHARLIE as three containers on one bridge network.

```bash
docker compose up --detach        # start the three nodes
docker compose exec alpha pnpm install   # first time only
docker compose ps                 # see what is running
docker compose down               # stop them
```

### The nodes

| Node | Address | Role | From the laptop |
| --- | --- | --- | --- |
| ALPHA | `10.53.0.10` | Names and front door | `127.0.0.1:5354` DNS, `127.0.0.1:8090` HTTP |
| BRAVO | `10.53.0.11` | Web backend | `127.0.0.1:8091` HTTP, `127.0.0.1:3001` TCP |
| CHARLIE | `10.53.0.12` | Web backend | `127.0.0.1:8082` HTTP, `127.0.0.1:3002` TCP |

Addresses are fixed, so zone data has actual A records.
Each node also resolves the others by name, so `curl http://bravo/` works from ALPHA.
Every node gets `ALPHA_ADDRESS`, `BRAVO_ADDRESS`, `CHARLIE_ADDRESS`, and `ZONE` in its environment.

Interact with the nodes when run via Docker Compose:

```bash
docker compose exec alpha bash           # shell as node@alpha
docker compose exec bravo sh             # a shell on a node
ssh bravo                                # from a shell on ALPHA
```

`dig`, `nc`, `telnet`, `curl`, `tcpdump`, `ping`, and `ssh` are installed on every node for checking the work from inside the network.
From ALPHA: `ssh bravo` and `ssh charlie` (key auth is baked into the image).

### Port 53

Containers run as an unprivileged user, the same as a service on the Pi should.
`node` has `cap_net_bind_service`, so it binds port 53 without root..

ALPHA publishes DNS on `5354`, not `5353`: `5353` is mDNS. macOS hosts binds that port to the Bonjour service by default.

```bash
dig @127.0.0.1 -p 5354 bravo.pi.world
```

### Killing a node

```bash
docker compose stop bravo
docker compose start bravo
```

## Monorepo

This repo is a pnpm workspace. Each package under `packages/*` is a TypeScript project. Scripts run via tsx.

| Package | Path            | Role in the system                         |
| ------- | --------------- | ------------------------------------------ |
| `@naming` | `packages/naming/` | Naming. Authoritative answers for `pi.world` |
| `@http`   | `packages/http/`   | HTTP. Parse requests and write responses |

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

### @naming

```bash
pnpm --filter @naming test
```

Requires **Node 26** (see `engines` in root `package.json`). Use [fnm](https://github.com/Schniz/fnm) or similar: `fnm use 26`.

### Adding a package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, and `src/`.
2. Set `"name": "@<scope>/<name>"` (or your chosen scope).
3. Add scripts with `tsx src/scripts/<name>.ts`.
