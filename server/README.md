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

### 3. Setup database
```bash
npm run db:generate
npm run db:push
npm run db:seed      # Seeds the default admin account
```

### 4. Run the server
```bash
npm run dev          # Runs node --watch src/server.js
```
The server will start at `http://localhost:4000`.

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

---

## 📡 API Overview

Base URL: `/api`

- **Auth**: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- **Todos**: `/api/todos`, `/api/todos/stats`, `/api/todos/:id`, `/api/todos/:id/toggle`, `/api/todos/completed`
- **Admin**: `/api/admin/stats`, `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/users/:id/status`, `/api/admin/todos`, `/api/admin/todos/:id`
- **Health**: `/health`, `/api/health`
