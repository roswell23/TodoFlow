# Server — TodoFlow API

Express 5 + Prisma 7 (Neon Postgres) REST API. CommonJS (`"type": "commonjs"`).
**Token budget: keep this file ≤ ~100 lines.** Facts + pointers only — never paste code, schemas, or endpoint implementations here; link to the file instead.

## Commands (run in `server/`)
| Task | Command |
|---|---|
| Dev (watch) | `npm run dev` |
| Start | `npm start` |
| Migrate | `npm run db:migrate` |
| Regenerate client | `npm run db:generate` |
| Studio / schema push | `npm run db:studio` / `npm run db:push` |

## Layout
```
src/server.js         boot: env check → helmet → cors → rate-limit → routes → 404 → 500
src/db.js             PrismaClient + Neon serverless adapter
src/routes/           authRoutes.js, todoRoutes.js   (path → controller only)
src/controllers/      authControllers.js, todoControllers.js  (validate + query + respond)
src/middleware/       authMiddleware.js              (Bearer JWT → req.user)
prisma/schema.prisma  User, Todo models  ← source of truth for data shape
prisma.config.ts      CLI datasource (uses DATABASE_URL_UNPOOLED)
```

## Environment (`.env`, never commit)
| Var | Used for |
|---|---|
| `JWT_SECRET` | signing tokens; boot fails if < 32 chars |
| `DATABASE_URL` | runtime connection (pooled) |
| `DATABASE_URL_UNPOOLED` | Prisma CLI migrations |
| `PORT` | default `4000` |
| `CLIENT_URL` | extra CORS origin |

## HTTP contract
Base path `/api`. JSON only (body limit 20kb). Auth: `Authorization: Bearer <jwt>` (7d).
| Method | Path | Auth | Success payload |
|---|---|---|---|
| GET | `/health` | – | `{ status, uptime }` |
| POST | `/auth/signup` | – | `{ message, user, token }` |
| POST | `/auth/login` | – | `{ message, user, token }` |
| GET | `/auth/me` | ✔ | `{ user }` |
| POST | `/auth/logout` | ✔ | `{ message }` |
| GET | `/todos?status,priority,category,search,sortBy,sortOrder` | ✔ | `{ todos }` |
| GET | `/todos/stats` | ✔ | `{ total, completed, active, highPriority, overdue, completionRate }` |
| POST | `/todos` | ✔ | `{ message, todo }` (201) |
| PUT | `/todos/:id` | ✔ | `{ message, todo }` |
| PATCH | `/todos/:id/toggle` | ✔ | `{ message, todo }` |
| DELETE | `/todos/:id` | ✔ | `{ message }` |
| DELETE | `/todos/completed` | ✔ | `{ message, count }` |

Errors are always `{ message }`: 400 validation, 401 bad creds/missing token, 404 not found or not owned, 429 rate limit (10 req / 15 min on login + signup), 500 generic.

## Rules (keep design stable)
1. Routes declare paths and middleware only — no queries, no business logic.
2. Every todo read/write is scoped by `userId`; ownership check returns 404 before update/toggle/delete.
3. Validation lives in the controller. Limits: title 200, description 5000, category 40, search 100 chars; password 8–128, bcrypt cost 10.
4. Each controller has its own try/catch, logs `console.error('<fn> error:', err)`, responds with a friendly `{ message }` — never a stack trace.
5. New endpoint checklist: route file → controller → export → row in the table above → `server/AGENTS.md` stays in sync.
6. Prefer editing an existing controller over adding a new layer; no ORM wrappers or repositories unless the schema grows substantially.

## Update this file when
an endpoint, env var, model, script, or rule above changes.
