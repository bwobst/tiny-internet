# DNS fixtures

Captured packets and expected decoded objects for `@dns` encoder/decoder tests.

## Layout

```text
pi-world-a/
  01-query.*               # inbound A query for the zone apex
  02-aa-answer.*           # AA response: three cluster A records

google-com-a/
  query.ts                 # shared query; only RD differs
  recursive/01-answer.*    # RD=1 → forwarder final answer
  iterative/
    01-root-referral.*     # hop 1: root → .com
    02-com-referral.*      # hop 2: .com → google NS
    03-authoritative-answer.*  # hop 3: final A
```

Stage 1 · Naming uses `pi-world-a` only.

`google-com-a` stays on disk. It is not a Sample for this stage.

Domain first (`pi-world-a`, `google-com-a`). Under `google-com-a`, mode (`recursive` / `iterative`) is how you got the packet, not two decoder code paths.

## File roles

| Suffix | Role |
| --- | --- |
| `.ts` | Source of truth for tests. Exports `wire` + `expected` (responses) or `query` / `wire` helpers (request). |
| `.bin` | Raw UDP payload from capture. Regenerate from the network or from `wire` via scripts. |
| `.pcap` | Same bytes wrapped for Wireshark (`03-bin-to-pcap.sh`). |

## Query

```ts
import { query, wire } from './google-com-a/query.js'

query({ rd: 1 }) // recursive
query({ rd: 0 }) // iterative
wire({ rd: 1 })  // 28-byte request buffer, RD=1
```

## Response map

Suggested decoder work order: easy answer → same shape with AA → small referral → large referral.

| Fixture | RD | an / ns / ar | What it proves |
| --- | --- | --- | --- |
| `recursive/01-answer` | 1 | 1 / 0 / 0 | One answer RR + name pointer |
| `iterative/03-authoritative-answer` | 0 | 1 / 0 / 0 | Same shape; AA=1 |
| `iterative/02-com-referral` | 0 | 0 / 4 / 8 | Walk many authority + additional RRs |
| `iterative/01-root-referral` | 0 | 0 / 13 / 12 | Same logic; more records |

## Capture scripts

From `packages/dns/`:

```bash
# Recursive answer
./scripts/01-capture-dns-response-bytes.sh \
  -o src/fixtures/google-com-a/recursive/01-answer.bin

# Iterative hop 1
./scripts/01-capture-dns-response-bytes.sh \
  -s 170.247.170.2 \
  --no-rd \
  -o src/fixtures/google-com-a/iterative/01-root-referral.bin
```
