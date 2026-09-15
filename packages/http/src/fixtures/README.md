# HTTP fixtures

Captured/authored bytes and their decoded objects for the `@http` parser/encoder.

## Layout

```text
get-root/
  01-request.*    # inbound GET / for the zone apex
  02-response.*   # 200 response carrying the product page body
```

## File roles

| Suffix | Role |
| --- | --- |
| `.ts` | Source of truth for tests. Exports `expected` (decoded object) and `wire` (bytes). |
| `.bin` | Raw TCP payload. Regenerate from `01-capture-http-request-bytes.sh` (request) or from `wire` (response). |

## Capture scripts

From `packages/http/`:

```bash
./scripts/01-capture-http-request-bytes.sh \
  -o src/fixtures/get-root/01-request.bin
```

`01-request.bin` is a real `curl` request, captured with `nc` standing in for
the server. `02-response.bin` is authored directly from `02-response.ts`'s
`wire` export: there is no independent HTTP server on the other end yet, so
the response oracle is the spec-correct bytes for the object in `expected`.
