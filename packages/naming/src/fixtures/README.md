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
| `.pcap` | Same DNS bytes as the `.bin`, inside one dummy Ethernet, IPv4, and UDP frame. For Wireshark. |

`01-query.bin` and `02-aa-answer.bin` are authored oracles, not captures from a public resolver.

`01-query.pcap` and `02-aa-answer.pcap` are the same oracles, not captures.
The outer headers are fake.
Wireshark uses UDP port `53` to show the payload as DNS.

`01-query.pcap` is the client query.
IPv4 is `10.0.0.2` to `10.0.0.1`.
UDP is port `53535` to port `53`.
The 26-byte DNS payload matches `01-query.bin`.

`02-aa-answer.pcap` is the server reply, so the addresses are reversed.
IPv4 is `10.0.0.1` to `10.0.0.2`.
UDP is port `53` to port `53535`.
The 74-byte DNS payload matches `02-aa-answer.bin`.
