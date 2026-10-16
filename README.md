# Bug Tracker Lite — Full Stack Issue Tracking Platform

A secure, production-grade issue tracking web application built with **React**, **Node.js**, **Express**, **MongoDB (Mongoose)**, and **AWS S3**. Authenticated software developers can create, list, filter, edit, and delete bugs with direct-to-S3 screenshot attachments via secure pre-signed URLs.

---

## 🌐 Live Deployed URLs

The application is deployed live on AWS (EC2 + S3 + MongoDB Atlas) with an automated GitHub Actions CI/CD pipeline:

| Component | Live URL | Description |
|---|---|---|
| **Frontend Web App** | [http://35.154.14.223](http://35.154.14.223) | Complete React user interface (Port 80) |
| **Backend API Root** | [http://35.154.14.223/api](http://35.154.14.223/api) | Express REST API endpoints |
| **API Health Check** | [http://35.154.14.223/api/health](http://35.154.14.223/api/health) | Real-time service uptime & database status |
| **Interactive Swagger Docs** | [http://35.154.14.223/api/docs/](http://35.154.14.223/api/docs/) | Interactive Swagger UI API documentation |
| **OpenAPI Specification (JSON)** | [http://35.154.14.223/api/docs/json](http://35.154.14.223/api/docs/json) | Raw OpenAPI 3.0 schema |

---

## 1. Project Overview

**Bug Tracker Lite** is built for engineering teams to report, manage, and resolve software bugs securely. 

### Key Capabilities:
- **Strict Server-Side Ownership Enforcement**: Users can only view, edit, or delete their own bugs. Attempting to query or mutate another user's bug ID strictly returns `403 Forbidden`.
- **Direct-to-S3 Pre-Signed Uploads**: Screenshots are uploaded directly from the browser to a private S3 bucket using short-lived pre-signed `PUT` URLs. The server never handles raw image streams or base64 blobs, preventing memory exhaustion.
- **Private S3 Storage & Pre-signed Viewing**: The S3 bucket has "Block all public access" enabled. Images are rendered using temporary pre-signed `GET` URLs (15-minute expiration).
- **Automated Orphan Cleanup**: Deleting a bug or replacing an image automatically deletes the old file from AWS S3, preventing storage leaks.
- **Brute-Force Protection**: Signup and login routes are rate-limited to 5 requests per minute per IP, returning standard `429 Too Many Requests`.

---

## 2. Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS design system.
- **Backend**: Node.js, Express 4, TypeScript, Zod (schema validation), Helmet (HTTP security headers), Morgan & custom structured JSON logger.
- **Database**: MongoDB with Mongoose ODM (compound indexes & full-text search index).
- **Authentication**: JWT (`jsonwebtoken`) and bcrypt password hashing (12 salt rounds).
- **Cloud Storage**: AWS S3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`).
- **Deployment**: AWS EC2 (Ubuntu 24.04 LTS), Docker, Docker Compose, Nginx reverse proxy.
- **CI/CD**: GitHub Actions (automated testing, build verification, and zero-downtime SSH deployment).
- **Testing**: Jest, Supertest, and `mongodb-memory-server` (31 automated tests).

---

## 3. Local Setup Instructions

### Prerequisites
- Node.js 20+ installed (`node -v`)
- npm 10+ installed (`npm -v`)
- Git installed

### 1. Clone the repository
```bash
git clone https://github.com/rajaNayak123/Bug-Tracker.git
cd Bug-Tracker
```

### 2. Install dependencies
Install dependencies for both backend and frontend:
```bash
npm --prefix backend install
npm --prefix frontend install
```

---

## 4. Environment Variables Required

### Root / Backend Environment Variables (`backend/.env`):
Create a `.env` file inside `backend/` (or copy from `backend/.env.example`):

```bash
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Connection (MongoDB URI or Atlas connection string)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/Bug-Tracker

# JWT Secret & Expiration
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=1d

# AWS S3 Private Storage
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-private-bucket-name
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Security & CORS
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=5
```

### Frontend Environment Variables (`frontend/.env`):
Optional for local development. Defaults to `/api` proxy in Vite:
```bash
VITE_API_URL=http://localhost:5001
```

---

## 5. Database Setup

You can use either **Local MongoDB** or **MongoDB Atlas** (Cloud):

### Option A: MongoDB Atlas (Recommended for Production)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Cluster**.
3. Under **Database Access**, create a database user with password.
4. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere).
5. Click **Connect** → **Drivers** and copy your connection URI into `backend/.env` under `MONGODB_URI`.

### Option B: Zero-Config In-Memory Database (Fastest for Local Testing)
You can run the backend without installing MongoDB at all! An embedded MongoDB server will spin up in RAM automatically:
```bash
npm --prefix backend run dev:mem
```

---

## 6. AWS / S3 Configuration

### 1. Create a Private S3 Bucket
1. Open the **AWS S3 Console** and click **Create bucket**.
2. Give it a globally unique name (e.g. `bugtracker-attachments-<yourname>`).
3. Select your desired AWS Region (e.g. `ap-south-1` or `us-east-1`).
4. Ensure **"Block all public access"** is checked ✅.
5. Click **Create bucket**.

### 2. Configure S3 CORS
To allow browser-to-S3 direct uploads:
1. Click your bucket name → **Permissions** tab.
2. Scroll to **Cross-origin resource sharing (CORS)** and paste:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 3. IAM User Credentials
Create an IAM User with `AmazonS3FullAccess` (or scoped to your bucket) and generate an **Access Key ID** & **Secret Access Key**. Place these in your `backend/.env`.

---

## 7. How to Run Frontend and Backend

### Development Mode

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# OR for zero-setup in-memory database:
npm run dev:mem
```
*Backend runs on `http://localhost:5001`.*

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

### Run Using Docker Compose (Full Stack)
```bash
docker compose up -d --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001/api`
- Swagger UI: `http://localhost:5001/api/docs/`

---

## 8. API Details

All routes are prefixed with `/api`. Protected routes require the `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/health` | No | Check server uptime and database connectivity |
| `POST` | `/api/auth/signup` | No | Register new user with hashed password (Rate limited: 5 req/min) |
| `POST` | `/api/auth/login` | No | Authenticate user and return signed JWT (Rate limited: 5 req/min) |
| `POST` | `/api/bugs/upload-url` | **Yes** | Request short-lived pre-signed S3 PUT URL for screenshot upload |
| `GET` | `/api/bugs` | **Yes** | List authenticated user's bugs (Supports `?status=open\|in-progress\|closed`) |
| `POST` | `/api/bugs` | **Yes** | Create a new bug report with optional S3 imageKey |
| `GET` | `/api/bugs/:id` | **Yes** | Get bug details with pre-signed GET image URL (Strict ownership check) |
| `PUT` | `/api/bugs/:id` | **Yes** | Update bug fields and cleanup old S3 image on replacement |
| `DELETE` | `/api/bugs/:id` | **Yes** | Delete bug and remove associated image from AWS S3 |

*Interactive testing is available via Swagger at [http://35.154.14.223/api/docs/](http://35.154.14.223/api/docs/).*

---

## 9. Deployment Details

### Infrastructure Architecture (AWS EC2 + S3 + MongoDB Atlas)
```
[User Browser]
       │
       ▼
 [AWS EC2 Instance (t3.micro - Ubuntu 24.04)]
 ┌────────────────────────────────────────────────────────┐
 │ Nginx (Port 80): Serves React Production SPA           │
 │ Reverse Proxy  : Forwards `/api/*` to Node.js (5001)   │
 └────────────────────────────┬───────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
    [MongoDB Atlas (Free M0)]    [Private AWS S3 Bucket]
    (Cloud Database)             (Pre-signed Direct Uploads)
```

### Automated CI/CD Pipeline (GitHub Actions)
Located in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
1. **Continuous Integration (CI)**:
   - Triggers on every push and pull request to `main`.
   - Runs backend TypeScript compilation and 31 automated tests.
   - Runs frontend TypeScript type checking and Vite production bundling.
   - Verifies Docker Compose configuration and container builds.
2. **Continuous Deployment (CD)**:
   - On successful merge to `main`, securely connects to the EC2 server via SSH (`appleboy/ssh-action`).
   - Pulls the latest commit (`git pull origin main`).
   - Automatically rebuilds and re-launches Docker containers (`docker compose up -d --build`).
   - Validates live server health with an automated curl check against `/api/health`.

---

## 10. Automated Tests

Run the backend automated test suite:
```bash
cd backend
npm test
```

### Test Results: 31/31 Passing Across 7 Test Suites
- `bugs.test.ts`: CRUD operations, status filters, and **403 Forbidden security ownership isolation**.
- `auth.test.ts`: Signup, login, password hashing, duplicate email rejection, JWT expiry.
- `s3.test.ts`: Pre-signed URL generation, file type whitelisting, 5MB file size limit.
- `rateLimit.test.ts`: Verifies HTTP 429 Too Many Requests response on rate limit breach.
- `health.test.ts`: Verifies health check returns healthy status and database connection.
- `swagger.test.ts`: Verifies Swagger UI HTML and raw OpenAPI 3.0 JSON endpoints.
- `logger.test.ts`: Verifies structured JSON logging and automatic redaction of sensitive credentials.
