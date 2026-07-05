# Employee Task Management System (ETMS)

A full-stack task management system with role-based access (Admin/Employee), real-time
notifications, file attachments, dashboards, and reporting.

**Stack**: React 19 + TypeScript + Redux Toolkit/RTK Query + Tailwind (frontend) · Node/Express +
TypeScript + PostgreSQL/Prisma + Redis + Kafka + Socket.io (backend).

For the full build history, design decisions, and verification evidence, see
[`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md). For diagrams, see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). For the raw schema + seed data, see
[`docs/database.sql`](docs/database.sql).

---

## Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** 15+
- **Redis** 7+
- **Apache Kafka** (any recent version; KRaft mode, no ZooKeeper needed)

On macOS, the quickest path is Homebrew:

```bash
brew install postgresql@16 redis kafka
brew services start postgresql@16
brew services start redis
brew services start kafka
```

> **Kafka topic auto-creation**: some Kafka versions ship with
> `auto.create.topics.enable=false` by default. If the backend logs
> `"This server does not host this topic-partition"` on first run, create the topics
> manually once:
> ```bash
> for t in task.created task.assigned task.updated task.completed notification.created; do
>   kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic "$t" --partitions 3 --replication-factor 1
> done
> ```

Alternatively, a `docker-compose.yml` is provided in `E-Management-Backend/` that runs
Postgres, Redis, and Kafka (with topic auto-create enabled) in containers:

```bash
cd E-Management-Backend
docker compose up -d
```

---

## 1. Backend Setup

```bash
cd E-Management-Backend
npm install
cp .env.example .env
```

Edit `.env` — at minimum set real random strings for `JWT_ACCESS_SECRET` and
`COOKIE_SECRET` (32+ characters each), and point `DATABASE_URL`/`REDIS_URL`/`KAFKA_BROKERS`
at wherever those services are running:

```env
DATABASE_URL=postgresql://<user>@localhost:5432/task_management?schema=public
JWT_ACCESS_SECRET=<random 32+ char string>
COOKIE_SECRET=<random 32+ char string>
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
```

Create the database, run migrations, and seed demo data:

```bash
createdb task_management
npm run prisma:deploy      # applies committed migrations
npm run prisma:seed        # idempotent — safe to re-run
```

Start the API in dev mode (auto-reloads on file changes):

```bash
npm run dev
```

The API listens on `http://localhost:5001`. Interactive API docs (Swagger UI) are at
`http://localhost:5001/api-docs`.

### Seeded credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@taskmanagement.local` | `Admin@12345` |
| Employee | `alice@taskmanagement.local` | `Employee@123` |
| Employee | `bob.martinez@taskmanagement.local` | `Employee@123` |
| Employee | `carol@taskmanagement.local` | `Employee@123` |
| Employee | `david@taskmanagement.local` | `Employee@123` |

(4 employees across Engineering/Sales/HR/Marketing, 8 demo tasks spanning every status —
pending/in-progress/completed/overdue.)

### Backend tests

```bash
createdb task_management_test
DATABASE_URL="postgresql://<user>@localhost:5432/task_management_test?schema=public" npm run prisma:deploy
npm test
```

Tests read connection details from `.env.test` (copy `.env` and point `DATABASE_URL` at the
test database). The suite skips rate limiting automatically under `NODE_ENV=test`.

---

## 2. Frontend Setup

```bash
cd E-Management-Frontend
npm install
cp .env.example .env
```

Defaults in `.env.example` already point at the backend above — adjust only if you changed
`PORT` in the backend's `.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

Start the dev server:

```bash
npm run dev
```

The app is served at `http://localhost:5173`.

### Frontend tests

```bash
npm test
```

---

## 3. Everyday Commands

| Command (run inside the relevant project folder) | What it does |
|---|---|
| `npm run dev` | Start the dev server (backend: ts-node-dev; frontend: Vite) |
| `npm run build` | Type-check + production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm test` | Run the test suite (backend: Jest+Supertest; frontend: Vitest+RTL) |
| `npm run prisma:studio` | Open Prisma Studio (visual DB browser) — backend only |
| `npm run prisma:migrate` | Create + apply a new migration in dev — backend only |

---

## 4. Project Structure

```
E-Management/
├── E-Management-Backend/     # Express API
│   ├── src/
│   │   ├── config/           # env, prisma client, redis, logger
│   │   ├── controllers/      # thin HTTP ⇄ service translation
│   │   ├── services/         # business rules
│   │   ├── repositories/     # Prisma-isolated data access
│   │   ├── routes/           # Express routers
│   │   ├── middlewares/      # auth, rbac, csrf, validate, rate-limit, error
│   │   ├── validators/       # Zod schemas
│   │   ├── kafka/            # producer, consumers, topics
│   │   ├── sockets/          # Socket.io gateway
│   │   ├── jobs/             # node-cron due-soon reminder
│   │   ├── emails/           # Nodemailer templates
│   │   ├── docs/             # OpenAPI/Swagger document
│   │   └── uploads/          # Multer disk storage (gitignored contents)
│   ├── prisma/                # schema.prisma, migrations, seed.ts
│   └── tests/                 # Jest + Supertest suite
│
├── E-Management-Frontend/     # React SPA
│   └── src/
│       ├── pages/              # route-level views
│       ├── components/         # common/ + feature-specific components
│       ├── forms/               # React Hook Form + Zod schemas
│       ├── redux/               # store, slices, RTK Query API modules
│       ├── routes/              # router config, ProtectedRoute/RoleRoute
│       ├── services/            # axios instance, socket client, refresh logic
│       └── hooks/                # custom hooks
│
└── docs/
    ├── PROJECT_PLAN.md         # full build log with verification evidence
    ├── ARCHITECTURE.md         # system/flow diagrams
    └── database.sql            # standalone schema + seed data script
```

---

## 5. Key Design Notes

- **Auth**: JWT access token (15 min, memory-only) + rotating opaque refresh token
  (httpOnly cookie, hashed at rest). Reuse of a revoked refresh token revokes the entire
  session chain (theft detection). CSRF-protected via double-submit cookie on the two
  cookie-only-authenticated routes (`/auth/refresh`, `/auth/logout`).
- **RBAC**: enforced server-side in middleware, not just hidden in the UI — every
  Employee-scoped query is filtered at the repository layer.
- **Notifications**: task mutations publish Kafka events; three independent consumer
  groups (DB write, Socket.io push, email) fan out from the same event, so adding a new
  side-effect never touches `task.service.ts`.
- **Dashboards**: Redis cache-aside with a 60s TTL, explicitly invalidated on every task
  mutation so results are never stale beyond an actual write.
- **File uploads**: MIME-allowlisted (PDF/JPG/PNG), 5MB cap, streamed for download through
  an authenticated controller — never served via `express.static`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for diagrams of all of the above, and
[`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the phase-by-phase verification log
(what was tested, how, and any bugs caught along the way).
