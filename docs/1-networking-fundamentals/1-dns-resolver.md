### Stage 1 · Naming

> Build the naming system for your tiny internet.

**In the platform:** Nothing in the platform should hardcode an IP address. This stage gives you `pi.world`, `alpha.pi.world`, `bravo.pi.world`, and `charlie.pi.world`, so every later layer can refer to a node by name and keep working when that node's address changes.

**Scope:** enough DNS to authoritatively answer for your own zone and to resolve names outside it. Not a production resolver.

*Formerly: DNS Resolver.*

**Recommended stack:** Node.js (built-in `dgram` for UDP)

#### Step 1 - Parse a response

**Goal:** Decode a raw response buffer into a structured JavaScript object.

**Inputs & outputs:**
- Input: raw response Buffer
- Output: `{ id, flags, questions: [...], answers: [{ name, type, class, ttl, rdata }], ... }`

**Key questions:**
- How do you read a 16-bit big-endian integer from a Buffer at a given offset?
- What is DNS message compression, and how does a pointer (0xC0 prefix) work?
- How many answer records does the ANCOUNT field tell you to expect?

**Done when:**
- Querying `example.com` returns at least one answer with `type: "A"` and a valid IPv4 address string
- You can also parse the TTL as a number (seconds)

**Watch out:** DNS name compression uses 2-byte pointers that jump to an earlier offset in the *same packet*. If you parse names linearly without following pointers, you'll get garbage for most real-world responses.

---

#### Step 2 - Send a raw UDP DNS query

**Goal:** Construct a valid DNS query packet by hand and send it to a public resolver.

**Inputs & outputs:**
- Input: a domain name string (e.g. `"example.com"`) and a record type (`A`)
- Output: a raw UDP response buffer from `8.8.8.8:53`

**Key questions:**
- What is the wire format of a DNS message? (RFC 1035 §4)
- What fields live in the header, and what are their sizes in bits?
- How is a domain name encoded as a sequence of labels?

**Done when:**
- You can send a query and `console.log` a non-empty Buffer back
- The first two bytes of the response match the ID you sent

**Watch out:** DNS labels are length-prefixed, not dot-separated on the wire. `example.com` becomes `\x07example\x03com\x00` - the trailing null byte is required.

---

#### Step 3 - Walk the hierarchy (iterative resolution)

**Goal:** Resolve a domain from the root servers down without relying on a forwarder.

**Inputs & outputs:**
- Input: domain name string
- Output: resolved IP address(es), reached via root → TLD → authoritative nameserver

**Key questions:**
- What are the root server IP addresses, and where do you hardcode them?
- What response code and section tell you to follow a referral vs. accept a final answer?
- What is the difference between a REFERRAL (no answer, authority section populated) and a NOERROR with answers?

**Done when:**
- Running your resolver against `dig` output for the same domain produces identical A records
- The console shows each hop: root → TLD nameserver → authoritative nameserver → answer

**Watch out:** Authoritative servers often return glue records (A records for the nameservers themselves) in the Additional section. If you ignore those, you'll have to do an extra lookup just to contact the nameserver - follow the glue when it's present.

---

#### Step 4 - Add a TTL-aware cache

**Goal:** Cache resolved records and serve them from cache until TTL expires.

**Inputs & outputs:**
- Input: a query for a domain you've already resolved
- Output: cached answer with remaining TTL (not the original TTL)

**Key questions:**
- Should you store the absolute expiry timestamp or the original TTL? Which makes remaining-TTL calculation easier?
- What is your cache key? Just the domain, or domain + record type?
- What should happen on a cache miss after the TTL expires?

**Done when:**
- A second query for the same domain returns instantly and logs `[cache hit]`
- After waiting for the TTL to expire (test with a low-TTL domain), the next query triggers a fresh lookup
- The returned TTL decrements correctly across repeated queries

**Watch out:** Store the expiry time (`Date.now() + ttl * 1000`), not the original TTL. Returning a stale TTL value on cache hits is a common off-by-one that violates RFC 1035 §3.2.1.

---

#### Step 5 - Answer authoritatively for `pi.world`

**Goal:** Stop being only a client. Listen on port 53 and answer queries for your own zone.

**Inputs & outputs:**
- Input: an inbound query packet for `pi.world`, `alpha.pi.world`, `bravo.pi.world`, or `charlie.pi.world`
- Output: a response packet carrying the A records for your nodes, with AA set

**Key questions:**
- Which header bits change between a query and a response, and which one claims authority?
- Where does the zone data live - hardcoded, a file, or something a node can update when its address changes?
- What do you return for a name in your zone that does not exist, versus a name outside your zone entirely?
- Port 53 is privileged. How will you run this on the Pi - root, `CAP_NET_BIND_SERVICE`, or a high port plus a redirect?

**Done when:**
- `dig @alpha.local bravo.pi.world` returns the right A record with the `aa` flag set
- `dig @alpha.local nope.pi.world` returns NXDOMAIN, not an empty NOERROR
- Pointing your laptop's resolver at ALPHA lets you `ping charlie.pi.world` with no `/etc/hosts` entry

**Watch out:** A name that does not exist is NXDOMAIN. A name that exists with no record of the requested type is NOERROR with zero answers. Getting these backwards makes clients retry in ways that are confusing to debug later.

---

#### Step 6 - Make it the platform's resolver

**Goal:** Run it as a real service on ALPHA, and let the rest of the network use it.

**Inputs & outputs:**
- Input: every DNS query from your laptop and from the other two nodes
- Output: authoritative answers for `pi.world`, resolved answers for everything else

**Key questions:**
- What happens to the rest of the platform when ALPHA's DNS process dies? Is that acceptable yet?
- Should nodes query you over UDP only? What makes a response too large for UDP, and what does a client do about it?
- How do you keep the service running across a reboot, and how do you see its logs?

**Done when:**
- Your laptop is configured to use ALPHA as its resolver and normal web browsing still works
- BRAVO and CHARLIE resolve each other by name through your server
- You reboot ALPHA and DNS comes back without you starting it by hand

**Watch out:** The moment your laptop depends on this for all DNS, a bug in it takes your internet down, not just your project. Keep a second resolver configured, and know how to switch back.

---

**Next:** the names resolve, but nothing answers on the other end yet. [Stage 2 · Transport](./2-tcp-server.md).
