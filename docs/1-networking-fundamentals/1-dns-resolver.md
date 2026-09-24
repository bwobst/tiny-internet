### Stage 1 · Naming

> Build an authoritative nameserver for `pi.world`.

**Enables:** `dig pi.world` against ALPHA returns the cluster addresses. Later stages do not hardcode IPs.

**Scope:** Authoritative answers for `pi.world` and the node names under it. No walk, no cache, no forwarder.

*Formerly: DNS Resolver.*

#### Step 1 - Decode a query

**Goal:** Decode an inbound A query for `pi.world` into a message object.

**Shape:**
- Input: UDP payload bytes
- Output:
  - header
    - transactionId: 16-bit integer
    - flags
      - qr: integer
      - opcode: integer
      - aa: integer
      - tc: integer
      - rd: integer
      - ra: integer
      - rcode: integer
    - qdcount: integer
    - ancount: integer
    - nscount: integer
    - arcount: integer
  - questions: list of
    - name: string
    - type: integer
    - class: integer

**Key questions:**
- Where does the 12-byte header end and the question start?
- How is a name stored on the wire if it is not a dotted string? (RFC 1035 §3.1)
- Which header fields are counts, and which of them must be 1 for this Sample?

**Watch out:** Names on the wire are length-prefixed labels, not dots. A linear read that treats `.` as a separator will not match the oracle.

**Samples:**

##### Sample 1 - pi.world A query

The oracle is the bytes in [`01-query.bin`](../../packages/naming/src/fixtures/pi-world-a/01-query.bin) and the decoded object in [`01-query.ts`](../../packages/naming/src/fixtures/pi-world-a/01-query.ts).

**Done when:**
- Decode `wire` from `01-query.ts`. The result equals `decoded`.

---

#### Step 2 - Encode an AA response

**Goal:** Encode an authoritative A response for `pi.world`.

**Shape:**
- Input:
  - header (same fields as Step 1)
  - questions (same fields as Step 1)
  - answers: list of
    - name: string
    - type: integer
    - class: integer
    - ttl: integer (seconds)
    - rdlength: integer
    - rdata: bytes
- Output: UDP payload bytes

**Key questions:**
- Which flag bits change from the query to a response that claims authority?
- What is in `rdata` for an A record, and how long is it?
- The apex name `pi.world` already appeared in the question. How can an answer name reuse those bytes? (RFC 1035 §4.1.4)

**Watch out:** If you write the apex name out in full in every answer, your bytes will not match the oracle. Most answers point back at the question name.

**Samples:**

##### Sample 1 - pi.world AA answer

The oracle is the bytes in [`02-aa-answer.bin`](../../packages/naming/src/fixtures/pi-world-a/02-aa-answer.bin) and the decoded object in [`02-aa-answer.ts`](../../packages/naming/src/fixtures/pi-world-a/02-aa-answer.ts).

**Done when:**
- Encode the message in `02-aa-answer.ts`. The bytes equal `wire`.

---

#### Step 3 - Answer on the wire

**Goal:** Listen on ALPHA and answer zone queries so Compose `dig` matches these transcripts.

**Shape:**
- Input: a DNS query datagram on ALPHA
- Output: a DNS response datagram
  - `pi.world` A: AA, NOERROR, A records for ALPHA, BRAVO, and CHARLIE
  - `bravo.pi.world` A: AA, NOERROR, BRAVO's A
  - a name under `pi.world` that is not in the zone: AA, NXDOMAIN
  - a name outside `pi.world`: REFUSED

**Key questions:**
- From the laptop, which address and port reach ALPHA's port 53? From inside the Compose network, which?
- What is the difference between NXDOMAIN and REFUSED for these four names?
- Which header bit is set on every in-zone answer, including NXDOMAIN?

**Watch out:** Compose Checks use `127.0.0.1` port `5354` (host publish). Inside a node, the same service is port `53`. `dig`'s id, WHEN, Query time, and MSG SIZE change every run. Match status, flags, and record sets. The stage Enables line is still the Pis: nodes use ALPHA by name, with no hardcoded IPs and no `/etc/hosts` crutch.

**Samples:**

##### Sample 1 - dig pi.world

```
dig @127.0.0.1 -p 5354 pi.world
```

```
; <<>> DiG 9.10.6 <<>> @127.0.0.1 -p 5354 pi.world
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 1
;; flags: qr aa rd; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 0
;; WARNING: recursion requested but not available

;; QUESTION SECTION:
;pi.world.			IN	A

;; ANSWER SECTION:
pi.world.		300	IN	A	10.53.0.10
pi.world.		300	IN	A	10.53.0.11
pi.world.		300	IN	A	10.53.0.12

;; Query time: 1 msec
;; SERVER: 127.0.0.1#5354(127.0.0.1)
;; WHEN: Tue Sep 15 13:00:00 PDT 2026
;; MSG SIZE  rcvd: 74
```

##### Sample 2 - dig bravo.pi.world

```
dig @127.0.0.1 -p 5354 bravo.pi.world
```

```
; <<>> DiG 9.10.6 <<>> @127.0.0.1 -p 5354 bravo.pi.world
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 1
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 0
;; WARNING: recursion requested but not available

;; QUESTION SECTION:
;bravo.pi.world.		IN	A

;; ANSWER SECTION:
bravo.pi.world.		300	IN	A	10.53.0.11

;; Query time: 1 msec
;; SERVER: 127.0.0.1#5354(127.0.0.1)
;; WHEN: Tue Sep 15 13:00:00 PDT 2026
;; MSG SIZE  rcvd: 48
```

##### Sample 3 - dig nope.pi.world

```
dig @127.0.0.1 -p 5354 nope.pi.world
```

```
; <<>> DiG 9.10.6 <<>> @127.0.0.1 -p 5354 nope.pi.world
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 1
;; flags: qr aa rd; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 0
;; WARNING: recursion requested but not available

;; QUESTION SECTION:
;nope.pi.world.			IN	A

;; Query time: 1 msec
;; SERVER: 127.0.0.1#5354(127.0.0.1)
;; WHEN: Tue Sep 15 13:00:00 PDT 2026
;; MSG SIZE  rcvd: 31
```

##### Sample 4 - dig google.com

```
dig @127.0.0.1 -p 5354 google.com
```

```
; <<>> DiG 9.10.6 <<>> @127.0.0.1 -p 5354 google.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: REFUSED, id: 1
;; flags: qr rd; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 0
;; WARNING: recursion requested but not available

;; QUESTION SECTION:
;google.com.			IN	A

;; Query time: 1 msec
;; SERVER: 127.0.0.1#5354(127.0.0.1)
;; WHEN: Tue Sep 15 13:00:00 PDT 2026
;; MSG SIZE  rcvd: 28
```

**Done when:**
- dig pi.world
- dig bravo.pi.world
- dig nope.pi.world
- dig google.com

---

**Next:** the names resolve, but nothing answers on the other end yet. [Stage 2 · Transport](./2-tcp-server.md).
