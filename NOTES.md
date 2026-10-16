# Engineering Notes & Architecture Decisions

These notes cover my engineering thought process, key trade-offs, and scaling considerations while building Bug Tracker Lite.

---

## 1. What I prioritized within the available time

When building this project, I focused heavily on core functionality, security, and clean architecture rather than superficial features:

- **Strict Server-Side Ownership Security**: Frontend checks can be bypassed easily with cURL or Postman, so I made sure every single read, edit, and delete request verifies that the bug belongs to the authenticated user (`bug.userId.toString() === req.user.userId`). If another user tries to access someone else's bug ID, the backend immediately halts with a `403 Forbidden`.
- **Direct-to-S3 Pre-Signed Uploads**: I did not want images flowing through the Express backend as multipart forms or heavy base64 strings. That bloats server memory and creates bottlenecks. Instead, the backend generates short-lived pre-signed PUT URLs so the browser uploads directly to S3. When viewing, short-lived pre-signed GET URLs (15-min expiry) are generated on the fly.
- **S3 Lifecycle & Storage Cleanup**: When a bug is deleted, its screenshot in S3 is automatically deleted too. When a user edits a bug and replaces an image, the previous S3 object is deleted so storage costs don't build up with orphaned files.
- **Automated Tests**: I wrote 31 automated tests with Jest and MongoDB Memory Server covering auth, security ownership checks, rate limiting, and S3 pre-signed URL generation. I wanted confidence that edge cases and security protections wouldn't break during refactors.
- **Fast Developer Workflow**: I added an in-memory dev mode (`npm run dev:mem`) so anyone evaluating the repo can clone it and run the backend immediately without having to install or configure MongoDB locally.

---

## 2. What I deliberately skipped

To keep the scope clean and deliver a reliable app within the timeline, I skipped a few things that are better suited for large-scale production:

- **Chunked Multipart Uploads**: For large files (like 100MB+ videos), AWS multipart upload is required. But since the requirements strictly capped screenshots at 5MB, single-part pre-signed PUT requests were much simpler and faster.
- **HttpOnly Cookie Refresh Token Rotation**: I used standard JWT Bearer tokens in `localStorage`. While `httpOnly` cookies provide better protection against XSS, storing JWTs in `localStorage` kept the SPA setup straightforward and avoided cross-domain cookie issues during local development and testing. In an enterprise setting, I'd implement access tokens in memory paired with an `httpOnly`, `Secure` cookie for refresh tokens.
- **Complex Multi-Tenant Roles (RBAC)**: I implemented user-level isolation where each developer manages their own bugs. I avoided adding multi-level organizations, teams, or admin roles to keep the codebase focused on the core requirements.

---

## 3. Why I selected MongoDB over PostgreSQL

I chose MongoDB (with Mongoose) for this assignment for three practical reasons:

1. **Flexible Issue Schema**: Bug tracking tools evolve quickly. You frequently need to add fields like browser version, OS, reproduction steps, or custom tags. A document model handles semi-structured data cleanly without needing database migration scripts for every schema update.
2. **Compound Index Performance**: In this app, nearly every read query is filtered by the logged-in user and sorted by date or status (e.g., `db.bugs.find({ userId, status }).sort({ createdAt: -1 })`). With MongoDB compound indexes on `{ userId: 1, createdAt: -1 }` and `{ userId: 1, status: 1, createdAt: -1 }`, these queries execute as fast, indexed in-memory scans.
3. **Mongoose Lifecycle Helpers**: Mongoose makes it easy to sanitize outputs. I used schema transforms to automatically remove `password` and `__v` before sending responses, ensuring sensitive data is never accidentally leaked to clients.

---

## 4. Why I selected this AWS deployment approach

I chose **AWS EC2 (Ubuntu) with Docker Compose and Nginx** paired with **MongoDB Atlas** and a **Private S3 Bucket**:

- **Free Tier & Low Cost**: An EC2 `t3.micro` instance falls within the AWS Free Tier ($0/month). Managed container services like ECS Fargate or EKS have baseline fees that are unnecessary for an app of this size.
- **All-in-One Container Orchestration**: Running frontend and backend inside Docker Compose on EC2 makes deployment completely reproducible. What works on my local machine runs identically on the cloud server.
- **Reverse Proxy Simplicity**: Nginx acts as the front door on port 80. It serves the compiled React static bundle with caching and reverse-proxies `/api/` traffic to the Node.js backend on port 5001. This completely avoids cross-origin (CORS) complications in production because both frontend and API share the same domain and port.
- **Automated CI/CD**: I wired up GitHub Actions so every `git push` automatically runs linting and all 31 tests, then SSHs into EC2 to pull the update and rebuild the containers with zero downtime.

---

## 5. If this needed to support 10,000 users tomorrow, what would break first and what would I change?

### What would break first?

1. **In-Memory Rate Limiting**: The current login rate limiter stores request counts in the Node.js process memory. As soon as you scale to multiple server instances behind a load balancer, rate limit counts won't be shared across instances, and heavy traffic could exhaust process memory.
2. **CPU Bottleneck on Password Hashing & S3 URL Signing**: Bcrypt hashing (12 rounds) is intentionally CPU-heavy. At 10,000 concurrent active users, login requests and generating HMAC signatures for pre-signed GET URLs on long bug lists would saturate a single server's CPU.
3. **Single EC2 Node & RAM**: A single `t3.micro` instance (1 GB RAM) would struggle under high concurrent network connections and memory pressure.

### What I would change:

1. **Distributed Rate Limiting with Redis**: Replace the in-memory store in `express-rate-limit` with Redis (using AWS ElastiCache). This shares rate limit counters and user sessions across all backend nodes seamlessly.
2. **CloudFront CDN with Signed Cookies for Images**: Instead of having the Node backend calculate pre-signed S3 URLs on every page load, place Amazon CloudFront in front of the private S3 bucket. Users would receive a CloudFront signed cookie upon login, allowing browsers to fetch images directly from global edge caches with much lower latency.
3. **Horizontal Auto-Scaling with AWS ECS / Fargate & ALB**: Move from a single EC2 instance to containers running on AWS ECS Fargate behind an Application Load Balancer (ALB). Set auto-scaling policies to add container tasks automatically based on CPU utilization.
4. **Database Read Replicas & Connection Pooling**: Enable MongoDB Atlas Read Replicas. Send heavy read operations (dashboard bug listing) to read replicas while routing creates/updates/deletes to the primary node.
5. **Asynchronous S3 Cleanup Queue**: When deleting bugs or replacing screenshots, push the S3 deletion task onto an AWS SQS queue processed by a background worker or Lambda function, keeping the API response sub-50ms.
