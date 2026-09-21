# Naming fixtures

Authored bytes and decoded objects for `@naming` encoder/decoder tests.

## Layout

```text
pi-world-a/
  01-query.*        # inbound A query for the zone apex
  02-aa-answer.*    # AA response: three cluster A records
```

Stage 1 · Naming uses `pi-world-a` only.

## File roles

| Suffix | Role |
| --- | --- |
| `.ts` | Source of truth for tests. Exports `expected` (decoded object) and `wire` (bytes). |
| `.bin` | Raw UDP payload. Same bytes as `wire`. |

`01-query.bin` and `02-aa-answer.bin` are authored oracles, not captures from a public resolver.
