# @dns

The naming layer of [Tiny Internet](../../README.md).

This package answers authoritatively for the `pi.world` zone and resolves everything else, so no other part of the platform has to hardcode an IP address. It runs on ALPHA.

Spec: [Stage 1 · Naming](../../docs/1-networking-fundamentals/1-dns-resolver.md).

## Scripts

### Tests

```bash
pnpm test                              # all workspace packages
pnpm test:coverage                     # all packages, with coverage
pnpm --filter @dns test                # this package only
pnpm --filter @dns test:coverage       # this package, with coverage
pnpm --filter @dns test:watch          # watch mode
```

Tests live next to source as `*.test.ts`.
Fixtures and the decoder work order live in [`src/fixtures/README.md`](./src/fixtures/README.md).

### One-time UDP query (manual)

```bash
pnpm exec tsx packages/dns/src/query.ts
```

### Automatically re-run on change

```bash
pnpm exec tsx watch packages/dns/src/query.ts
```
