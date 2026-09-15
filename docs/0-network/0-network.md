### Stage 0 · Network

> Make the three Nodes reach each other, so the later stages have a cluster to run on.

**Enables:** From ALPHA you can `ssh bravo`, and a process on ALPHA can open a socket to a process on CHARLIE.

**Scope:** Fixed addresses, names that resolve on each Node, SSH between Nodes, and one TCP connection between two Nodes. No DNS server, no HTTP, no service you wrote.

#### Step 1 - Give each Node a fixed address

**Goal:** Give ALPHA, BRAVO, and CHARLIE addresses that survive a reboot.

**Shape:**
- Input: a Node
- Output:
  - name: string
  - address: IPv4 address
  - prefix: integer (bits)
  - gateway: IPv4 address

**Key questions:**
- Which addresses in your subnet does the router hand out by DHCP, and which are yours to assign?
- A static lease on the router and a static address on the Node both survive a reboot. Which one do you have to redo when a Node is reinstalled?
- What is the gateway for, when every Sample here stays inside one subnet?

**Watch out:** An address that came from DHCP looks right until the lease expires or the router restarts. Reboot the Node and check the address again before you call this done.

**Samples:**

##### Sample 1 - alpha address

```
docker compose exec alpha ip -4 addr show eth0
```

```
2: eth0@if211: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default  link-netnsid 0
    inet 10.53.0.10/24 brd 10.53.0.255 scope global eth0
       valid_lft forever preferred_lft forever
```

##### Sample 2 - alpha route

```
docker compose exec alpha ip route
```

```
default via 10.53.0.1 dev eth0 
10.53.0.0/24 dev eth0 proto kernel scope link src 10.53.0.10 
```

**Done when:**
- alpha address
- alpha route

---

#### Step 2 - Reach the other Nodes

**Goal:** Reach BRAVO and CHARLIE from ALPHA, by address and by name.

**Shape:**
- Input:
  - target: name or IPv4 address
  - count: integer (packets)
- Output:
  - transmitted: integer
  - received: integer
  - loss: percent
  - rtt: milliseconds

**Key questions:**
- Where does the name `bravo` resolve on this Node, before you have written a DNS server?
- Which failure tells you the name did not resolve, and which tells you the address did not answer?
- Stage 1 removes this name source. What does the Enables line for Naming say ALPHA has to do instead?

**Watch out:** Names work here because something local already maps them. That mapping is a starting point, not the finished cluster: Naming replaces it, and a leftover `/etc/hosts` entry will hide a broken zone. Times and sequence numbers change every run - match the resolved address, the loss count, and the error text.

**Samples:**

##### Sample 1 - ping bravo by name

```
docker compose exec alpha ping -c 3 bravo
```

```
PING bravo (10.53.0.11) 56(84) bytes of data.
64 bytes from bravo.tiny-internet_tiny-internet (10.53.0.11): icmp_seq=1 ttl=64 time=0.196 ms
64 bytes from bravo.tiny-internet_tiny-internet (10.53.0.11): icmp_seq=2 ttl=64 time=0.326 ms
64 bytes from bravo.tiny-internet_tiny-internet (10.53.0.11): icmp_seq=3 ttl=64 time=0.130 ms

--- bravo ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2027ms
rtt min/avg/max/mdev = 0.130/0.217/0.326/0.081 ms
```

##### Sample 2 - ping charlie by address

```
docker compose exec alpha ping -c 3 10.53.0.12
```

```
PING 10.53.0.12 (10.53.0.12) 56(84) bytes of data.
64 bytes from 10.53.0.12: icmp_seq=1 ttl=64 time=0.211 ms
64 bytes from 10.53.0.12: icmp_seq=2 ttl=64 time=0.329 ms
64 bytes from 10.53.0.12: icmp_seq=3 ttl=64 time=0.244 ms

--- 10.53.0.12 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2067ms
rtt min/avg/max/mdev = 0.211/0.261/0.329/0.049 ms
```

##### Sample 3 - ping an unknown name

```
docker compose exec alpha ping -c 1 delta
```

```
ping: delta: Name or service not known
```

**Done when:**
- ping bravo by name
- ping charlie by address
- ping an unknown name

---

#### Step 3 - Get a shell on another Node

**Goal:** Run a command on BRAVO and on CHARLIE from ALPHA, over SSH, without typing a password.

**Shape:**
- Input:
  - target: Node name
  - command: string
- Output:
  - stdout: string
  - exitCode: integer

**Key questions:**
- Which key does ALPHA present, and which file on BRAVO decides to accept it?
- A host key identifies the Node to you. What happens on the first connection, and what should happen if that key ever changes?
- `ssh bravo` with no user works only if something supplies one. Where does the user name come from?

**Watch out:** The first connection to a Node prints a host key warning and then succeeds. That line is not in the transcript below because the key is already known. Connect once to accept it, then take the transcript.

**Samples:**

##### Sample 1 - ssh bravo

```
docker compose exec alpha ssh bravo hostname
```

```
bravo
```

##### Sample 2 - ssh charlie

```
docker compose exec alpha ssh charlie 'hostname; ip -4 addr show eth0 | grep inet'
```

```
charlie
    inet 10.53.0.12/24 brd 10.53.0.255 scope global eth0
```

##### Sample 3 - ssh charlie to bravo

```
docker compose exec charlie ssh bravo hostname
```

```
bravo
```

**Done when:**
- ssh bravo
- ssh charlie
- ssh charlie to bravo

---

#### Step 4 - Open a socket between Nodes

**Goal:** Open a TCP connection from a process on ALPHA to a process on CHARLIE and carry one line of bytes.

**Shape:**
- Listener:
  - port: integer
  - received: bytes
- Connector:
  - target: Node name
  - port: integer
  - sent: bytes

**Key questions:**
- Which side has to be running first, and what does the other side see if it is not?
- The listener binds a port. Which addresses does it accept on, and does that matter on a Node with one interface?
- Ports under 1024 need a capability or root. Which range are you using here, and why does Naming not get that choice?

**Watch out:** A connection that hangs instead of being refused is a filter, not a dead process. Refused means the Node answered and nothing was listening. Sample 1 blocks until Sample 2 connects, so run it in its own shell and take both transcripts from the one exchange. The source port in the listener transcript changes every run - match the Node name and the bytes.

**Samples:**

##### Sample 1 - listener on charlie

```
docker compose exec charlie nc -lv -p 9000
```

```
Listening on 0.0.0.0 9000
Connection received on alpha.tiny-internet_tiny-internet 34354
hello from alpha
```

##### Sample 2 - connect from alpha

```
echo "hello from alpha" | docker compose exec -T alpha nc -v -w 2 charlie 9000
```

```
Connection to charlie (10.53.0.12) 9000 port [tcp/*] succeeded!
```

##### Sample 3 - connect to a closed port

```
docker compose exec alpha nc -v -w 2 charlie 9001
```

```
nc: connect to charlie (10.53.0.12) port 9001 (tcp) failed: Connection refused
```

**Done when:**
- listener on charlie
- connect from alpha
- connect to a closed port

---

**Next:** the Nodes reach each other, but only because something local already knows their names. [Stage 1 · Naming](../1-networking-fundamentals/1-dns-resolver.md).
