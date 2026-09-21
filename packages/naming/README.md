# @naming

The naming layer of [Tiny Internet](../../README.md).

This package answers authoritatively for the `pi.world` zone on ALPHA.
Later stages look up names instead of hardcoding IPs.

Spec: [Stage 1 · Naming](../../docs/1-networking-fundamentals/1-dns-resolver.md).

Fixtures live in [`src/fixtures/README.md`](./src/fixtures/README.md).

## Tests

```bash
pnpm test                              # all workspace packages
pnpm --filter @naming test             # this package only
pnpm --filter @naming test:watch       # watch mode
```

Tests live next to source as `*.test.ts`.
