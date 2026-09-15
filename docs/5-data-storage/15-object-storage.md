### Stage 15 · Object storage

> Store the blobs the site serves.

**In the platform:** Static assets and uploads stop living on one node's disk and start living in the cluster, which means they survive losing the node that received them.

**Scope:** storing and retrieving objects across your nodes. S3 compatibility is optional and only worth it if it teaches you something.

*Formerly: Object Storage.*

**Recommended stack:** Node.js (`http`, `crypto`, `fs`)

#### Step 1 - Put and Get objects

**Goal:** Implement `PUT /{bucket}/{key}` and `GET /{bucket}/{key}` over HTTP, storing objects on the local filesystem.

**Inputs & outputs:**
- Input: HTTP PUT with object bytes in the body; HTTP GET for an existing key
- Output: stored file on disk with an MD5 ETag; GET returns file bytes with correct Content-Type and Content-Length

**Key questions:**
- How do you map `bucket/key` to a filesystem path safely? (Prevent path traversal attacks)
- How do you compute and return the ETag? (MD5 of the object bytes, hex-encoded, quoted)
- What HTTP status codes do S3 use for PUT (201? 200?), GET-hit, and GET-miss?

**Done when:**
- `curl -T file.txt http://localhost:3000/mybucket/myfile.txt` stores the file and returns an ETag
- `curl http://localhost:3000/mybucket/myfile.txt` retrieves the original bytes exactly
- `curl http://localhost:3000/mybucket/missing.txt` returns `404` with an XML error body

**Watch out:** S3 returns `200 OK` for PUT, not `201 Created`, and the ETag is the MD5 wrapped in double quotes (`"d41d8cd98f00b204e9800998ecf8427e"`). Matching this exactly matters for AWS SDK compatibility.

---

#### Step 2 - Multipart upload

**Goal:** Allow large objects to be uploaded in parts, then assembled atomically.

**Inputs & outputs:**
- Input: `POST /{bucket}/{key}?uploads` → uploadId; `PUT /{bucket}/{key}?partNumber=N&uploadId=X` for each part; `POST /{bucket}/{key}?uploadId=X` with part manifest to complete
- Output: parts stored temporarily; completed object assembled and stored as a single file

**Key questions:**
- Where do you store incomplete parts? In a temp directory keyed by `uploadId`?
- What is the minimum part size for all but the last part? (S3 enforces 5MB - do you?)
- How do you validate the part manifest? (Part numbers, ETags)

**Done when:**
- Uploading a 20MB file in 5MB parts (4 parts) produces an assembled object identical to uploading it in one PUT (verify with SHA-256 hash)
- Incomplete uploads (missing parts) return a descriptive error on complete
- A `DELETE /{bucket}/{key}?uploadId=X` cleans up partial parts

**Watch out:** Assemble parts by concatenating them in part-number order, not upload order. Clients may upload parts out of order.

---

#### Step 3 - Presigned URLs

**Goal:** Generate time-limited, pre-authenticated URLs that allow third parties to GET or PUT objects without credentials.

**Inputs & outputs:**
- Input: `generatePresignedUrl({ bucket, key, method, expiresIn })` → URL with embedded signature and expiry
- Output: the URL, when requested within the expiry window, is served without any `Authorization` header; expired or tampered URLs return `403`

**Key questions:**
- What parameters must be signed? (Method, bucket, key, expiry timestamp, and your "secret key")
- How do you embed and verify the expiry without trusting the client to send it unspoofed?
- What is the canonical string-to-sign, and why does order matter?

**Done when:**
- A presigned GET URL works in a browser (no auth headers required)
- The same URL after `expiresIn` seconds returns `403 Forbidden`
- Modifying any URL parameter (key, expiry, bucket) causes a `403` due to signature mismatch

**Watch out:** Include the expiry timestamp in the signed string - don't just check it separately. If the expiry is not part of the signature, a client can extend it by modifying the URL parameter without breaking the signature.
