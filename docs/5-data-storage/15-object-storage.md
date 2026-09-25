### Stage 11 · Object storage

> Store the blobs the site serves, on disk, so one outlives the process that first wrote it.

**Enables:** A blob is still served after the Node that first stored it reboots.

**Scope:** storing and retrieving an object on one Node's filesystem, durably enough to survive that Node restarting. No replication across Nodes, no S3 compatibility, no multipart upload, no presigned URLs.

**Read:** [Amazon S3 objects overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingObjects.html).
An object is a key plus the bytes stored under that key, inside a bucket.

#### Step 1 - Put and Get an object

**Goal:** Implement `PUT /{bucket}/{key}` and `GET /{bucket}/{key}`, storing the object's bytes on the local filesystem before the PUT is acknowledged.

**Shape:**
- Input: HTTP PUT to `/{bucket}/{key}` with the object bytes as the body; HTTP GET to the same path
- Output: on PUT, the bytes durably on disk before the response is sent, and an ETag in the response; on GET, the exact bytes back with a matching ETag, or `404` if the key was never stored

**Read:** [Ensuring data reaches disk](https://lwn.net/Articles/457667/).
A reader can see a file while a write into it is still in progress.
The article explains when a replace is one fact on disk.

**Key questions:**
- How do you turn `bucket` and `key` into a path on disk without letting a crafted `key` write outside the bucket's directory?
- `fs.writeFile` returning does not mean the bytes are on disk (Stage 9 already forced you to answer this once). What has to happen before you send the PUT response, so that a GET immediately after - or a crash immediately after - never sees a half-written file at the path it reads from?
- What is the ETag over, and does it have to match on every future GET of the same bytes?

**Watch out:** Writing bytes straight into the final path means a reader (or a crash) can land mid-write and see a partial file at exactly the path GET trusts. Write to a temporary path first, force it to disk, then move it into place - the move is what makes "the file exists at this path" a single atomic fact instead of a window of corruption.

**Samples:**

##### Sample 1 - put and get a blob

```
docker compose exec alpha curl -s -i -X PUT http://bravo:7070/photos/logo.txt -d 'tiny internet'
docker compose exec alpha curl -s -i http://bravo:7070/photos/logo.txt
```

```
HTTP/1.1 200 OK
ETag: "b18d65500adc0811c3a4a37067cd1f43"
Content-Length: 0
Connection: close

HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Length: 13
ETag: "b18d65500adc0811c3a4a37067cd1f43"
Connection: close

tiny internet
```

**Done when:**
- put and get a blob

---

#### Step 2 - The blob survives the Node's reboot

**Goal:** Confirm a stored blob is still served, with the same bytes and the same ETag, after the Node that first stored it restarts.

**Shape:**
- Input: a Node restarted (or killed with `SIGKILL` and restarted) after a PUT has already been acknowledged
- Output: a GET on the restarted Node returns the same bytes and the same ETag as before the restart

**Read:** [fsync(2)](https://man7.org/linux/man-pages/man2/fsync.2.html).
`fsync` returns only after the bytes are on the device.
A later start of the process can read that same file.

**Key questions:**
- What has to be true about where object bytes live for a Node restart to preserve them, versus a path that gets wiped along with the process?
- Step 1's temp-file-then-rename protects a write that is in flight when the Node dies. Does it do anything for objects that were already stored and acknowledged earlier? Why or why not?

**Watch out:** A `docker compose restart` proves nothing if the object directory lives somewhere Compose recreates on restart. Confirm where the bytes actually persist before trusting this Sample - the Enables line is about the object surviving, not about the container coming back up.

**Samples:**

##### Sample 2 - blob survives a reboot

```
docker compose exec alpha curl -s -i -X PUT http://bravo:7070/photos/logo.txt -d 'tiny internet'
docker compose restart bravo
docker compose exec alpha curl -s -i http://bravo:7070/photos/logo.txt
```

```
HTTP/1.1 200 OK
ETag: "b18d65500adc0811c3a4a37067cd1f43"
Content-Length: 0
Connection: close

HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Length: 13
ETag: "b18d65500adc0811c3a4a37067cd1f43"
Connection: close

tiny internet
```

**Done when:**
- blob survives a reboot

---

**Next:** there is no next stage on the locked path.
