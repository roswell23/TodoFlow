# TodoFlow — REST API Server

The backend REST API for **TodoFlow**, built with **Express 5**, **Prisma 7**, and **Neon Serverless PostgreSQL**.

For full system architecture, client setup, and end-to-end documentation, visit the [Root README](../README.md).

---

## 🛠️ Tech Stack & Highlights

- **Express 5**: Fast, minimal Node.js web framework.
- **Prisma 7 & Neon**: Type-safe ORM connecting to Neon serverless PostgreSQL via `@prisma/adapter-neon` and `@neondatabase/serverless`.
- **JWT & Bcrypt**: Stateless 7-day authentication tokens with bcrypt password hashing (salt cost 10).
- **Security Hardened**: Helmet HTTP security headers, CORS origin whitelisting, 20 KB body size bounds, and auth endpoint rate limiting (10 attempts / 15 mins).
- **RBAC**: Multi-role support (`USER` and `ADMIN`) with isolated data ownership.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

| Variable | Description | Requirement |
|---|---|---|
| `DATABASE_URL` | Neon pooled PostgreSQL connection string | Required |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string (migrations) | Required |
| `JWT_SECRET` | Secret key for signing JWTs | Must be ≥ 32 characters |
| `PORT` | API listen port | Default: `4000` |
| `CLIENT_URL` | Additional CORS origin | e.g. `http://localhost:5173` |
| `BREVO_API_KEY` | Brevo API key for transactional emails | Required for live email delivery |
| `BREVO_SENDER_EMAIL` | Verified sender email configured in Brevo | e.g. `verify@yourdomain.com` |
| `BREVO_SENDER_NAME` | Sender display name for outgoing emails | Default: `TodoFlow` |

### 3. Setup database
```bash
npm run db:generate
node prisma/apply-schema.js
npm run db:seed      # Seeds the default admin account
```

### 4. Run the server
```bash
npm run dev          # Runs node --watch src/server.js
```
The server will start at `http://localhost:4000`.

---

## 📧 Brevo Transactional Email Setup & Local Testing

TodoFlow uses **Brevo**'s official SDK (`@getbrevo/brevo`) to dispatch responsive transactional emails containing 6-digit security codes for email verification and password reset.

### 1. Generating a Brevo API Key
1. Sign up or log into [Brevo](https://www.brevo.com/).
2. Click your account name at the top right and navigate to **SMTP & API** &rarr; **API Keys**.
3. Click **Generate a new API key**, give it a label (e.g. `todoflow-local`), and click **Generate**.
4. Copy the generated key (`xkeysib-...`) and paste it into `server/.env`:
   ```env
   BREVO_API_KEY="xkeysib-..."
   ```

### 2. Configuring the Sender Email
1. In Brevo, go to **Senders, Domains & Dedicated IPs** &rarr; **Senders**.
2. Add your desired sender email address and click the verification link Brevo delivers to your inbox.
3. Configure the verified address in `server/.env`:
   ```env
   BREVO_SENDER_EMAIL="your-verified-email@domain.com"
   BREVO_SENDER_NAME="TodoFlow"
   ```

### 3. Local Testing & Verification
- **Dev Simulation Mode**: If `BREVO_API_KEY` is omitted or empty, TodoFlow operates in safe simulation mode. It logs simulated deliveries to the console without breaking any registration or recovery flows.
- **Automated Verification Test Suite**: Run the automated test suite to verify code generation, SHA-256 hashing, 10-minute expiration, 60-second cooldown rate limiting, and anti-enumeration:
  ```bash
  npm run test:verification
  ```

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts server in watch mode (`node --watch`) |
| `npm start` | Starts server in production mode |
| `npm run db:generate` | Generates the Prisma client |
| `npm run db:push` | Pushes the schema to the database |
| `npm run db:migrate` | Runs database migrations |
| `npm run db:studio` | Opens Prisma Studio GUI in browser |
| `npm run db:seed` | Seeds initial administrator account |
| `npm run test:rbac` | Executes automated RBAC security and endpoint tests |
| `npm run test:subtasks` | Executes automated checklist/subtask tests |
| `npm run test:verification` | Executes automated Brevo verification and security tests |

---

## 📡 API Overview

Base URL: `/api`

- **Auth**:
  - `POST /api/auth/signup` — Register new user & automatically dispatch verification code
  - `POST /api/auth/login` — Authenticate and receive JWT
  - `POST /api/auth/request-code` / `POST /api/auth/send-code` — Request 6-digit code (anti-enumeration protected)
  - `POST /api/auth/resend-code` — Resend 6-digit code with 60-second cooldown rate limiting
  - `POST /api/auth/verify-code` — Validate 6-digit code and mark email verified
  - `POST /api/auth/reset-password` — Verify code and set new password
  - `GET /api/auth/me` — Current authenticated user profile
  - `POST /api/auth/logout` — Safe session logout
- **Todos**: `/api/todos`, `/api/todos/stats`, `/api/todos/:id`, `/api/todos/:id/toggle`, `/api/todos/completed`
- **Admin**: `/api/admin/stats`, `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/users/:id/status`, `/api/admin/todos`, `/api/admin/todos/:id`
- **Health**: `/health`, `/api/health`
