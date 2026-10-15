# Bug Tracker Lite — Full Stack Issue Tracking Platform

A secure, production-grade issue-tracking web application built with **React**, **Node.js**, **Express**, **MongoDB (Mongoose)**, and **AWS S3**. Enables authenticated software developers to create, view, edit, filter, and delete bugs with direct-to-S3 screenshot attachments via secure pre-signed URLs.

---

## 1. Project Overview

**Bug Tracker Lite** is designed with enterprise security and usability in mind. Key capabilities:
- Strict **server-side ownership verification**: Users can only view, mutate, or delete their own issues.
- **Direct-to-S3 pre-signed URL workflow**: Image screenshots bypass the application server entirely during upload, preventing memory leaks and high bandwidth costs.
- **Zero public bucket access**: AWS S3 buckets remain completely private (`Block Public Access` enabled). Images are viewed exclusively via short-lived pre-signed `GET` URLs (15-minute TTL).
- **Automated S3 lifecycle cleanup**: Deleting an issue or replacing an attachment automatically removes the stale object from S3, eliminating orphaned files.
- **Brute-force protection**: Authentication endpoints are rate-limited to 5 requests per minute per IP.

---

## 2. Features

- **Authentication & Authorization**:
  - Secure registration and login with bcrypt password hashing (salt factor 12).
  - JWT-based session tokens with configurable expiration.
  - Rate limiting (5 attempts/minute/IP) returning standard HTTP 429.
  - Case-insensitive, trimmed, and normalized user email addresses.
  - Automatic token expiration handling and client redirection.
- **Bug Management**:
  - Full CRUD operations scoped strictly to the authenticated user's ID.
  - Severity categories: `low`, `med`, and `high`.
  - Status progression: `open`, `in-progress`, and `closed`.
  - Server-side status filtering (`GET /api/bugs?status=open`) and keyword search.
  - Protection of immutable database fields (`_id`, `userId`, `createdAt`, `updatedAt`).
- **AWS S3 Integration**:
  - Pre-signed `PUT` URLs generated dynamically with 5-minute expiration.
  - Pre-signed `GET` URLs generated with 15-minute expiration for viewing.
  - Strict client and server-side validation: Allowed types (`.jpg`, `.jpeg`, `.png`, `.webp`), max size 5 MB.
  - Automated deletion of S3 objects on issue deletion or image replacement.
- **Developer-Centric UI**:
  - Modern, responsive dark slate interface built with React.
  - Real-time statistics counters (Total, Open, In Progress, Closed).
  - Filter pills and instant search.
  - Direct S3 upload with progress bar.
  - Delete confirmation modal.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Lucide React, Custom CSS Design System |
| **Backend** | Node.js (v20+ / v22+), Express 4, TypeScript, Helmet, CORS, Morgan |
| **Database** | MongoDB with Mongoose ODM |
| **File Storage** | AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) |
| **Authentication** | JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`) |
| **Validation** | Zod (strict schema validation for params, query, and body) |
| **Documentation** | Swagger / OpenAPI 3.0 (`swagger-ui-express`) at `/api/docs` |
| **Testing** | Jest, Supertest, `mongodb-memory-server` |
| **DevOps** | Docker, Multi-stage Dockerfiles, Docker Compose, Nginx |

---

## 4. Architecture Overview

### High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                  |
|   (React 18 SPA: Dashboard, Create Bug, Bug Detail, Edit Bug, Auth Forms)      |
+-------------------+------------------------------------+------------------------+
                    |                                    |
     1. REST API    |                     3. Direct PUT  |  4. Pre-signed GET
        (JWT Auth)  |                        (Upload)    |     (View Image)
                    v                                    v
+-------------------+-----------------+        +---------+------------------------+
|           EXPRESS BACKEND           |        |          AWS S3 BUCKET           |
|  - Rate Limiter (5 req/min)         |        |  - Private Bucket (Block Public) |
|  - Helmet & Security Headers        |        |  - Encrypted (SSE-S3)            |
|  - Zod Request Validation           |        |  - CORS for direct PUT           |
|  - Server-Side Ownership Check      |        +----------------------------------+
|  - S3 Pre-signed URL Generator      |                          ^
+-------------------+-----------------+                          |
                    |                                            |
                    | Mongoose ODM                               | Delete on cleanup
                    v                                            |
+-------------------+-----------------+                          |
|         MONGODB DATABASE            |--------------------------+
|  - Users Collection (Unique Email)  |
|  - Bugs Collection (Indexed queries)|
+-------------------------------------+
```

### Direct S3 Pre-Signed Upload Flow

```
Client (Browser)             Express Backend                   AWS S3
      |                             |                             |
      | 1. Select image (<5MB)      |                             |
      |---------------------------->|                             |
      |    POST /api/bugs/upload-url|                             |
      |    {fileName, fileType}     |                             |
      |                             | 2. Validate MIME & Size     |
      |                             |    Generate PutObjectCommand|
      |                             |    Sign URL (expires: 300s) |
      |                             |                             |
      | 3. Return uploadUrl & key   |                             |
      |<----------------------------|                             |
      |                             |                             |
      | 4. Direct HTTP PUT to S3 with Content-Type header         |
      |---------------------------------------------------------->|
      |    (Bypasses application server completely)               |
      |<----------------------------------------------------------|
      |    HTTP 200 OK                                            |
      |                             |                             |
      | 5. POST /api/bugs           |                             |
      |    {title, ..., imageKey}   |                             |
      |---------------------------->|                             |
      |                             | 6. Persist bug in MongoDB   |
      |<----------------------------|                             |
      |    HTTP 201 Created         |                             |
```

---

## 5. Project Structure

```
Bug-Tracker/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # Validated environment configuration
│   │   │   ├── db.ts               # Mongoose connection & lifecycle
│   │   │   └── s3.ts               # AWS S3 client setup
│   │   ├── controllers/
│   │   │   ├── authController.ts   # Signup, login, profile logic
│   │   │   ├── bugController.ts    # Bug CRUD + ownership verification
│   │   │   ├── healthController.ts # System & DB health endpoint
│   │   │   └── uploadController.ts # Pre-signed S3 upload URL handler
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts   # JWT validation & user extraction
│   │   │   ├── errorHandler.ts     # Centralized error handler
│   │   │   ├── rateLimiter.ts      # Auth rate limiter (5 req/min)
│   │   │   └── validate.ts         # Zod schemas & validator middleware
│   │   ├── models/
│   │   │   ├── User.ts             # Mongoose User model with unique index
│   │   │   └── Bug.ts              # Mongoose Bug model with compound indexes
│   │   ├── routes/
│   │   │   ├── authRoutes.ts       # /api/auth routes
│   │   │   └── bugRoutes.ts        # /api/bugs routes
│   │   ├── services/
│   │   │   └── s3Service.ts        # Pre-signed PUT/GET & S3 deletion
│   │   ├── swagger/
│   │   │   └── swaggerRoute.ts     # OpenAPI 3.0 UI definition
│   │   ├── utils/
│   │   │   └── logger.ts           # Structured logging with sensitive data redaction
│   │   ├── app.ts                  # Express application configuration
│   │   ├── server.ts               # Production server listener
│   │   └── devServer.ts            # Self-contained dev server with memory DB
│   ├── tests/
│   │   ├── auth.test.ts            # Signup, login, password hash, JWT tests
│   │   ├── bugs.test.ts            # CRUD, ownership check, filter, S3 cleanup tests
│   │   ├── rateLimit.test.ts       # 429 rate limit tests
│   │   ├── s3.test.ts              # S3 pre-signed URL & validation tests
│   │   └── setup.ts                # In-memory Mongo test database setup
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts           # API client, 401 interceptor & S3 direct upload
│   │   ├── components/
│   │   │   ├── DeleteModal.tsx     # Delete confirmation modal
│   │   │   ├── ImageUploader.tsx   # Pre-signed upload component with progress
│   │   │   ├── Navbar.tsx          # Responsive navigation header
│   │   │   ├── SeverityBadge.tsx   # Severity indicator pill
│   │   │   └── StatusBadge.tsx     # Status indicator pill
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Authentication context provider
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx        # Registration and Login forms
│   │   │   ├── BugDetailPage.tsx   # Full details view with pre-signed GET image
│   │   │   ├── CreateBugPage.tsx   # Bug creation form
│   │   │   ├── DashboardPage.tsx   # Bug list, metrics, status filters, search
│   │   │   └── EditBugPage.tsx     # Edit form with image replacement
│   │   ├── styles/
│   │   │   └── index.css           # Vanilla CSS modern design system
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── App.tsx                 # Main application with hash routing
│   │   └── main.tsx                # React DOM entry
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── nginx.conf
├── .env.example
├── README.md
└── NOTES.md
```

---

## 6. Prerequisites

- **Node.js**: v20.x or v22.x
- **npm**: v10.x+
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster (optional in dev, as embedded in-memory MongoDB is built-in).
- **AWS Account** (optional for local mock testing; required for live deployment): An S3 bucket and IAM credentials with PutObject, GetObject, and DeleteObject permissions.

---

## 7. Local Setup Instructions

### Step 1: Clone the Repository
```bash
git clone https://github.com/rajaNayak123/Bug-Tracker.git
cd Bug-Tracker
```

### Step 2: Install Dependencies
Install dependencies for both backend and frontend:
```bash
# In backend
cd backend && npm install

# In frontend
cd ../frontend && npm install
```

### Step 3: Configure Environment Variables
Create `.env` file in the `backend/` directory:
```bash
cp .env.example backend/.env
```
*(Optionally adjust parameters such as `PORT`, `MONGODB_URI`, `JWT_SECRET`, and `AWS_S3_BUCKET`).*

---

## 8. MongoDB Setup

You can connect Bug Tracker Lite to either **MongoDB Atlas** or a **local MongoDB instance**:

### Option A: MongoDB Atlas (Cloud)
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Under **Database Access**, create a database user with read/write privileges.
3. Under **Network Access**, add `0.0.0.0/0` (or your EC2/local IP address).
4. Click **Connect -> Connect your application** and copy the URI string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/bugtracker?retryWrites=true&w=majority
   ```

### Option B: Local MongoDB
Ensure `mongod` is running on port 27017:
```env
MONGODB_URI=mongodb://localhost:27017/bugtracker
```

### Option C: Zero-Config In-Memory Database (Development)
The project includes a ready-to-run in-memory MongoDB server:
```bash
cd backend && npm run dev:mem
```
*(Requires no local MongoDB installation or cloud connection; perfect for rapid evaluation!)*

---

## 9. Environment Variable Reference

| Variable | Default (Dev) | Description |
|---|---|---|
| `PORT` | `5001` | Express backend listening port |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `MONGODB_URI` | `mongodb://localhost:27017/bugtracker` | Connection string to MongoDB instance |
| `JWT_SECRET` | *(dev fallback provided)* | 32+ character cryptographically secure secret |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime (e.g., `1d`, `12h`, `7d`) |
| `AWS_REGION` | `us-east-1` | AWS region where S3 bucket resides |
| `AWS_S3_BUCKET` | `bug-tracker-lite-attachments` | Name of the private S3 bucket |
| `AWS_ACCESS_KEY_ID` | *(IAM credential)* | AWS Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | *(IAM credential)* | AWS Secret Access Key |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin for CORS |
| `RATE_LIMIT_WINDOW_MS`| `60000` | Rate limiter window duration in milliseconds (1 min) |
| `RATE_LIMIT_MAX` | `5` | Maximum auth attempts allowed per IP per window |
| `VITE_API_URL` | `http://localhost:5001` | Frontend target URL for API requests |

---

## 10. Startup Commands

### Run Locally (Development)

**Terminal 1 — Backend (with auto-spinning MongoDB):**
```bash
cd backend
npm run dev:mem
```
*Backend runs at `http://localhost:5001` with Swagger docs at `http://localhost:5001/api/docs`.*

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
*Frontend runs at `http://localhost:3000`.*

### Run via Docker Compose
To launch MongoDB, Backend, and Frontend containers simultaneously:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001/api`
- API Documentation: `http://localhost:5001/api/docs`

---

## 11. API Endpoint Documentation

Live interactive Swagger / OpenAPI UI is accessible at:
```
http://localhost:5001/api/docs
```

### Summary of Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check (reports DB & system status) |
| `POST` | `/api/auth/signup` | Rate-Limited | Register new user account |
| `POST` | `/api/auth/login` | Rate-Limited | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | JWT | Get current authenticated user profile |
| `POST` | `/api/bugs/upload-url` | JWT | Request pre-signed S3 upload PUT URL |
| `GET` | `/api/bugs` | JWT | List bugs belonging to user (supports `?status=`) |
| `POST` | `/api/bugs` | JWT | Create a new bug associated with user |
| `GET` | `/api/bugs/:id` | JWT | Get bug details with pre-signed GET image URL |
| `PUT` | `/api/bugs/:id` | JWT | Update bug (server ownership enforced) |
| `DELETE`| `/api/bugs/:id` | JWT | Delete bug and remove image from S3 |

### Example Requests & Responses

#### 1. Register User (`POST /api/auth/signup`)
```bash
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Developer",
    "email": "jane@example.com",
    "password": "Password123!"
  }'
```
**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "6ad0f1f5ab7c9a309ee06a54",
      "name": "Jane Developer",
      "email": "jane@example.com",
      "createdAt": "2026-10-15T15:32:05.333Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. Request S3 Pre-signed Upload URL (`POST /api/bugs/upload-url`)
```bash
curl -X POST http://localhost:5001/api/bugs/upload-url \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "crash_screenshot.png",
    "fileType": "image/png",
    "fileSize": 524288
  }'
```
**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Pre-signed S3 upload URL generated successfully",
  "data": {
    "uploadUrl": "https://bug-tracker-lite-attachments.s3.us-east-1.amazonaws.com/bugs/6ad0.../123-crash_screenshot.png?X-Amz-Algorithm=...",
    "imageKey": "bugs/6ad0f1f5ab7c9a309ee06a54/82fb65fa-crash_screenshot.png",
    "expiresIn": 300,
    "requiredHeaders": {
      "Content-Type": "image/png"
    }
  }
}
```

#### 3. Create Bug (`POST /api/bugs`)
```bash
curl -X POST http://localhost:5001/api/bugs \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dropdown overlaps modal footer",
    "description": "When opening multi-select in Safari, z-index causes overlay clipping.",
    "severity": "med",
    "status": "open",
    "imageKey": "bugs/6ad0f1f5ab7c9a309ee06a54/82fb65fa-crash_screenshot.png"
  }'
```

---

## 12. AWS S3 Bucket, IAM, and CORS Configuration

### 1. S3 Bucket Privacy (Mandatory)
- Create bucket: `my-private-bug-tracker-bucket`.
- **Block Public Access**: Enable all 4 settings (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`).
- **Bucket Encryption**: Enable SSE-S3 (AES-256).

### 2. S3 CORS Configuration
In AWS Console -> S3 -> Your Bucket -> **Permissions** -> **Cross-origin resource sharing (CORS)**, save:
```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "GET"
    ],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. Least-Privilege IAM Policy
Create an IAM user or role attached to your EC2 instance with the following minimal policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBugTrackerS3Actions",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-private-bug-tracker-bucket/*"
    }
  ]
}
```

---

## 13. Pre-Signed URL Upload Flow

1. **Validation on Client**: Before requesting an upload URL, the browser checks that the file is an image (`.jpg`, `.jpeg`, `.png`, `.webp`) and is `<= 5 MB`.
2. **URL Generation**: The client calls `POST /api/bugs/upload-url` with `{ fileName, fileType, fileSize }`.
3. **Backend Signing**: The server validates the metadata and issues a signed `PUT` URL with a 5-minute TTL, scoping the object path under `bugs/${userId}/${uuidv4()}-${cleanFileName}`.
4. **Direct Browser-to-S3 Upload**: The browser makes an HTTP `PUT` request directly to S3 with the image binary and `Content-Type`.
5. **Associating Object Key**: Once the upload completes, the returned `imageKey` is stored alongside the bug record in MongoDB.
6. **Viewing**: When fetching bug details, the backend signs a temporary `GET` URL (15-minute TTL) allowing authorized viewing without ever making the S3 bucket public.

---

## 14. AWS Deployment Steps

### Option A: AWS EC2 (Single or Split Instance) — Cost-Conscious & Recommended
1. **Launch EC2 Instance**:
   - Instance type: `t4g.small` or `t3.micro` (AWS Free Tier eligible).
   - OS: Ubuntu 22.04 LTS or Amazon Linux 2023.
   - Attach IAM Role with S3 permissions (avoids embedding access keys on the instance!).
2. **Install Node.js & Process Manager**:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm nginx git
   sudo npm install -g pm2
   ```
3. **Clone and Build**:
   ```bash
   git clone https://github.com/rajaNayak123/Bug-Tracker.git /var/www/bug-tracker
   cd /var/www/bug-tracker/backend
   npm install && npm run build
   cd /var/www/bug-tracker/frontend
   npm install && npm run build
   ```
4. **Configure PM2**:
   ```bash
   cd /var/www/bug-tracker/backend
   pm2 start dist/server.js --name "bug-tracker-api" -i max
   pm2 startup && pm2 save
   ```
5. **Configure Nginx**:
   Use `nginx.conf` to serve `/var/www/bug-tracker/frontend/dist` on port 80/443 and proxy `/api/` to `http://127.0.0.1:5001`.
6. **Configure SSL**:
   Run `sudo certbot --nginx` to obtain free Let's Encrypt HTTPS certificates.

### Option B: S3 + CloudFront (Frontend) and AWS Elastic Beanstalk (Backend)
- Deploy the frontend `dist/` directory to an S3 static bucket behind AWS CloudFront.
- Deploy the backend directory to Elastic Beanstalk (Node.js platform) configured with environment variables in the AWS Management Console.

---

## 15. Testing Instructions

### Run the Automated Test Suite
The automated test suite runs in-band with isolated in-memory MongoDB instances and mocks external S3 calls:

```bash
cd backend
npm test
```

### Coverage of Automated Tests
- **`auth.test.ts`**:
  - Successful user signup and password hashing verification.
  - Case-insensitive duplicate email rejection (409 Conflict).
  - Validation failures for short passwords or invalid emails.
  - Credential verification and JWT issuance on login.
  - Rejection of invalid credentials.
  - Rejection of missing, malformed, or expired JWTs.
- **`bugs.test.ts`**:
  - Bug creation and user association.
  - Scoped listing ensuring users cannot see other users' bugs.
  - Status filtering (`?status=open`, `?status=closed`).
  - **Ownership validation**: Verifies that User B receives `403 Forbidden` when attempting to GET, PUT, or DELETE User A's issue.
  - Invalid MongoDB ObjectId validation (`400 Bad Request`).
  - Image cleanup: Replacing an image deletes the old image from S3.
  - Bug deletion: Deleting a bug deletes the database record and calls S3 delete.
- **`rateLimit.test.ts`**:
  - Verifies that after 5 authentication attempts in 1 minute, subsequent attempts return `HTTP 429 Too Many Requests`.
- **`s3.test.ts`**:
  - Validates pre-signed URL generation.
  - Rejects invalid MIME types (`application/pdf`, `image/gif`).
  - Rejects files exceeding 5 MB limit.

---

## 16. Known Limitations and Troubleshooting

1. **Local Port 5000 Conflict on macOS**:
   On macOS Monterey/Ventura/Sonoma/Sequoia, the native AirPlay Receiver listens on port 5000 by default. To prevent collision, Bug Tracker Lite defaults to port `5001`.
2. **CORS on S3 Direct Upload**:
   If direct uploads fail with a network error, ensure your S3 bucket CORS policy includes the client origin (`http://localhost:3000` or production URL) with the `PUT` method allowed.
3. **Database Connection Failures**:
   If connecting to MongoDB Atlas, ensure your IP address is whitelisted under Atlas Network Access (`0.0.0.0/0` for initial testing).
4. **Token Storage Security**:
   Tokens are stored in `localStorage` for simplicity in single-page applications. For banking-grade security, refer to `NOTES.md` for discussion on moving to `httpOnly` secure cookies.
