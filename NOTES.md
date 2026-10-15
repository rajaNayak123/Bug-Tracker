# NOTES.md — Architecture & Engineering Trade-offs

This document details the engineering decisions, trade-offs, architecture reasoning, and scale-out considerations for **Bug Tracker Lite**.

---

## 1. What was prioritized within the available time

1. **Security & Authorization Enforcements**:
   - Backend ownership validation was prioritized above all else. Every CRUD operation strictly verifies that `bug.userId.toString() === req.user.userId`. Even if a malicious actor modifies an ID in the request path, the backend strictly returns `403 Forbidden`.
   - Rate limiting (5 attempts/min/IP) on signup and login to protect against credential stuffing and brute-force attacks.
   - Elimination of sensitive data leaks: Passwords and password hashes are automatically stripped in Mongoose `toJSON` transforms, and the structured logger automatically redacts authorization headers, tokens, and passwords.

2. **Direct-to-S3 Pre-Signed Upload Flow**:
   - The entire image upload lifecycle uses AWS S3 pre-signed `PUT` and `GET` URLs. The server never receives images as base64 blobs or multipart payloads, avoiding CPU spikes and memory exhaustion.
   - Strict validation of file types (JPG, JPEG, PNG, WebP) and 5 MB size limit both on the client and server.
   - Automatic S3 orphan cleanup on issue deletion and image replacement.

3. **Production Robustness & Developer Experience**:
   - Built with strict TypeScript on both backend and frontend.
   - Comprehensive automated test suite (26 tests across auth, bug CRUD, security ownership, S3 signing, and rate limiting) running in-memory with `mongodb-memory-server`.
   - Interactive Swagger/OpenAPI documentation at `/api/docs`.
   - Multi-stage Dockerfiles and `docker-compose.yml` for containerized orchestration.

---

## 2. What was deliberately skipped

1. **Multipart Chunked Uploads for Gigabyte-Sized Files**:
   - Because the requirements restrict screenshots to 5 MB, single-part pre-signed S3 `PUT` requests were chosen over AWS S3 Multipart Uploads (which add unnecessary complexity for small screenshots).
2. **Refresh Token Rotation & HttpOnly Cookies**:
   - Session management uses standard JWT Bearer tokens in `localStorage`.
   - *Security Trade-off*: Storing tokens in `localStorage` simplifies cross-domain SPA APIs and prevents CSRF attacks entirely. However, it is theoretically vulnerable to XSS. In a full production enterprise system, storing refresh tokens in an `httpOnly`, `Secure`, `SameSite=Strict` cookie paired with a short-lived access token in memory would be preferred.
3. **Complex Multi-Tenant Role-Based Access Control (RBAC)**:
   - The assignment specified a minimal issue tracker where authenticated users manage their own bugs. Advanced organization hierarchies (e.g., Workspace Admin, QA Member, Read-Only Observer) were skipped to maintain simplicity and focus on rock-solid ownership isolation.

---

## 3. Why MongoDB was selected

1. **Dynamic Schema & Issue Flexibility**:
   - Bug tracking systems frequently evolve to include custom metadata (e.g., browser versions, screen resolutions, operating system flags, stack traces). MongoDB's document-oriented JSON model handles semi-structured issue data naturally without requiring complex SQL migration scripts for every schema change.
2. **Compound Indexing for User-Scoped Access Patterns**:
   - The query patterns in Bug Tracker Lite are almost exclusively filtered by user:
     - `db.bugs.find({ userId: ..., status: ... }).sort({ createdAt: -1 })`
   - By creating compound indexes on `{ userId: 1, createdAt: -1 }` and `{ userId: 1, status: 1, createdAt: -1 }`, MongoDB satisfies all dashboard queries with high-performance index scans.
3. **Mongoose Lifecycle & Transform Hooks**:
   - Mongoose provides pre-save validation, cast error formatting, and `toJSON` transforms that guarantee passwords and internal identifiers are never leaked in API responses.

---

## 4. Why the AWS deployment approach was selected

### Selected Approach: AWS EC2 (or Lightsail) with Nginx Reverse Proxy & PM2
1. **Cost-Conscious & Free Tier Friendly**:
   - An EC2 `t4g.small` or `t3.micro` instance falls within the AWS Free Tier ($0/month) or costs under $4–$8/month.
   - Managed container services (e.g., AWS ECS Fargate, EKS, or multi-AZ RDS) incur fixed baseline fees of $30–$70+/month, which is inappropriate for an assignment evaluation without explicit authorization.
2. **Simplicity and Maintainability**:
   - Nginx handles TLS termination (via free Let's Encrypt certificates), serves the static React production bundle with HTTP caching, and reverse-proxies `/api/` requests to the Node.js process.
   - PM2 provides automatic restart on crashes, zero-downtime reloads, and clustering across available CPU cores.
3. **Private S3 Storage with IAM Instance Roles**:
   - Deploying on EC2 allows using an attached IAM Instance Profile. The Node.js application inherits temporary IAM credentials automatically from the EC2 instance metadata service, eliminating the need to store long-lived `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in environment files!

---

## 5. If the application needed to support 10,000 users tomorrow, what would break first and what would you change?

### 1. What would break first?
- **In-Memory Express Rate Limiter**:
  - The current rate limiter uses an in-memory memory store. As soon as multiple backend instances or server processes are deployed behind a load balancer, client requests from the same IP would hit different nodes, rendering IP rate tracking inconsistent and consuming Node.js heap memory.
- **Single-Node Node.js Event Loop**:
  - A single Node.js instance on a single server will become CPU-bound under high concurrent load (especially during bcrypt password hashing, which is deliberately computationally expensive).
- **Direct S3 Pre-Signed GET URL Generation**:
  - Generating pre-signed `GET` URLs on the fly for every bug in a list of 50+ items involves HMAC cryptographic calculations. Under 10,000 active concurrent requests, calculating thousands of S3 signatures per second creates significant server CPU overhead.

### 2. How the architecture would evolve:

1. **Distributed Rate Limiting & Session Store (Redis / ElastiCache)**:
   - Migrate `express-rate-limit` to use `rate-limit-redis`.
   - Store session invalidation lists and rate-limit counters in an AWS ElastiCache (Redis) cluster.
2. **CloudFront CDN for Image Delivery with Signed Cookies / URLs**:
   - Place an Amazon CloudFront distribution in front of the private S3 bucket using Origin Access Control (OAC).
   - Instead of having the backend sign S3 URLs, serve images via CloudFront edge locations with CloudFront Signed URLs or signed cookies, drastically lowering latency and offloading CPU overhead from the Node backend.
3. **Horizontal Scaling with AWS ECS / Fargate & ALB**:
   - Containerize the backend and deploy across multiple availability zones using an Application Load Balancer (ALB) and AWS ECS Fargate with Auto Scaling based on CPU/Memory utilization.
4. **Read Replicas & MongoDB Sharding**:
   - Move to a multi-node MongoDB Atlas cluster (Primary + Secondary Read Replicas).
   - Route read-heavy dashboard queries (`GET /api/bugs`) to secondary read replicas while routing writes to the primary.
   - Shard the bugs collection by `userId` to distribute data across multiple shards linearly.
5. **Worker Queue for Asynchronous S3 Cleanup (AWS SQS + Lambda)**:
   - Offload S3 deletion operations to an asynchronous AWS SQS queue processed by an AWS Lambda function, ensuring bug deletion API responses remain sub-50ms even if S3 delete latency spikes.
