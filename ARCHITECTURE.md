# Employee Task Management System — Architecture & Flow Diagrams

All diagrams below use standard Mermaid syntax and render natively on GitHub, in VS Code's
Markdown preview (with the Mermaid extension), or at [mermaid.live](https://mermaid.live).

---

## 1. System Architecture

```mermaid
graph TB
    subgraph Client
        FE["React 19 SPA<br/>Vite · Redux Toolkit · RTK Query<br/>Socket.io client · Recharts"]
    end

    subgraph API["Express API"]
        MW["Middleware<br/>helmet · cors · rate-limit · auth · rbac · csrf"]
        CTRL["Controllers"]
        SVC["Services<br/>(business rules)"]
        REPO["Repositories<br/>(Prisma isolation)"]
        SOCK["Socket.io Gateway"]
    end

    subgraph Data
        PG[("PostgreSQL<br/>source of truth")]
        REDIS[("Redis<br/>dashboard cache ·<br/>rate-limit store")]
    end

    subgraph Events["Event Backbone"]
        KAFKA["Kafka Broker<br/>topics: task.*, notification.created"]
        NC["Notification Consumer<br/>writes DB row"]
        SC["Socket Consumer<br/>emits to user:{id} room"]
        EC["Email Consumer<br/>Nodemailer"]
    end

    CRON["node-cron<br/>hourly due-soon sweep"]

    FE -- "HTTPS / REST" --> MW
    MW --> CTRL --> SVC --> REPO --> PG
    SVC -- "cache-aside" --> REDIS
    MW -- "rate-limit counters" --> REDIS
    SVC -- "publish task.* event" --> KAFKA
    CRON -- "publish task.assigned<br/>(TASK_DUE_SOON)" --> KAFKA
    KAFKA --> NC --> PG
    NC --> KAFKA
    KAFKA --> SC
    KAFKA --> EC
    SC -- "notification:new" --> SOCK
    SOCK -- "WebSocket push" --> FE
```

**Why this shape:**
- Controllers stay thin; every business rule (e.g. "completed tasks can't be edited") lives in the **service layer**, testable in isolation from Express (see `tests/integration/task.test.ts`).
- **Repositories** isolate Prisma so services never import `@prisma/client` directly.
- Kafka decouples "a task was assigned" from "three things must happen as a result" (DB write, socket push, email). Adding a fourth side-effect later (e.g. a Slack webhook) means a new consumer group, zero changes to `task.service.ts`.
- Redis serves two independent purposes: response caching for read-heavy dashboard aggregates (60s TTL, explicitly invalidated on task mutations) and the rate limiter's counter store.

---

## 2. Request Lifecycle (Layered Architecture)

```mermaid
graph LR
    A[HTTP Request] --> B[helmet / cors / compression]
    B --> C[apiRateLimiter]
    C --> D["authenticate<br/>(JWT verify)"]
    D --> E["authorize(...roles)"]
    E --> F["validate(zodSchema)"]
    F --> G[Controller]
    G --> H[Service]
    H --> I[Repository]
    I --> J[(Prisma / PostgreSQL)]
    H -.->|fire-and-forget| K[Kafka publish]
    G --> L[sendSuccess/sendError]
    L --> M[JSON Response]
```

Every layer has exactly one job: middleware authenticates/authorizes/validates before the
handler runs; the controller only translates HTTP ⇄ service calls; the service holds every
business rule; the repository is the only place that talks to Prisma.

---

## 3. Database ER Diagram

```mermaid
erDiagram
    USER ||--o| EMPLOYEE : "has profile"
    USER ||--o{ REFRESH_TOKEN : issues
    USER ||--o{ AUDIT_LOG : performs
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ FILE : uploads
    EMPLOYEE ||--o{ TASK : "assigned to"
    TASK ||--o{ FILE : "has attachments"
    TASK ||--o{ NOTIFICATION : "triggers"

    USER {
        uuid id PK
        string fullName
        string email UK
        string passwordHash
        enum role
        boolean isActive
    }
    EMPLOYEE {
        uuid id PK
        uuid userId FK
        string department
        string designation
        boolean isDeleted
    }
    TASK {
        uuid id PK
        string title
        text description
        enum priority
        enum status
        datetime startDate
        datetime dueDate
        uuid assignedToId FK
        uuid createdById
        datetime completedAt
    }
    FILE {
        uuid id PK
        string originalName
        string storedName UK
        string mimeType
        int sizeBytes
        uuid taskId FK
        uuid uploadedById FK
    }
    NOTIFICATION {
        uuid id PK
        uuid userId FK
        uuid taskId FK
        enum type
        string message
        boolean isRead
    }
    REFRESH_TOKEN {
        uuid id PK
        uuid userId FK
        string tokenHash UK
        boolean rememberMe
        boolean revoked
        datetime expiresAt
    }
    AUDIT_LOG {
        uuid id PK
        uuid userId FK
        enum action
        string entity
        string entityId
        json metadata
    }
```

Full DDL: [`docs/database.sql`](./database.sql). Prisma source of truth: [`E-Management-Backend/prisma/schema.prisma`](../E-Management-Backend/prisma/schema.prisma).

---

## 4. Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client (browser)
    participant A as Express API
    participant DB as PostgreSQL

    Note over C,A: Login
    C->>A: POST /auth/login {email, password, rememberMe}
    A->>DB: bcrypt.compare + lookup User
    A->>DB: INSERT RefreshToken (hashed)
    A-->>C: 200 {accessToken} + Set-Cookie: refreshToken (httpOnly), XSRF-TOKEN

    Note over C,A: Authenticated request
    C->>A: GET /api/tasks (Authorization: Bearer accessToken)
    A-->>C: 200 {data}

    Note over C,A: Access token expires (15m) → silent refresh
    C->>A: POST /auth/refresh (Cookie: refreshToken, XSRF-TOKEN)<br/>Header: x-xsrf-token
    A->>A: verifyCsrf — cookie must match header
    A->>DB: lookup by tokenHash — must be un-revoked, unexpired
    A->>DB: mark old token revoked, INSERT new RefreshToken (rotation)
    A-->>C: 200 {new accessToken} + Set-Cookie: new refreshToken, new XSRF-TOKEN

    Note over C,A: Logout
    C->>A: POST /auth/logout (Cookie + x-xsrf-token)
    A->>DB: mark RefreshToken revoked
    A-->>C: 200 + clear both cookies
```

**Theft detection**: if a *revoked* refresh token is ever presented again (e.g. a stolen,
already-rotated cookie replayed by an attacker), the API revokes **every** token in that
user's chain, not just the one presented — forcing a full re-login everywhere.

**CSRF**: `/auth/refresh` and `/auth/logout` are the only two routes authenticated purely by
cookie (no bearer token to prove same-origin intent), so they're protected by a
double-submit cookie: the non-httpOnly `XSRF-TOKEN` cookie must match the `x-xsrf-token`
header. A cross-site attacker can trigger the request via the browser's ambient cookies,
but can't read the cookie's value to forge the matching header.

---

## 5. Kafka Event Flow (Notifications)

```mermaid
graph TD
    TS["Task Service<br/>(create / update / complete)"] -->|publish| T1[task.assigned]
    TS -->|publish| T2[task.updated]
    TS -->|publish| T3[task.completed]
    CRON["node-cron (hourly)<br/>due-soon sweep"] -->|publish, type=TASK_DUE_SOON| T1

    T1 & T2 & T3 --> NC["Notification Consumer<br/>(consumer group)"]
    NC -->|1. INSERT| DB[(notifications table)]
    NC -->|2. publish| NCR[notification.created]

    NCR --> SC["Socket Consumer<br/>(consumer group)"]
    NCR --> EC["Email Consumer<br/>(consumer group)"]

    SC -->|"emit('notification:new')<br/>to room user:{userId}"| WS[Socket.io → Browser]
    EC -->|Nodemailer| MAIL[SMTP]

    WS --> BADGE["Live toast +<br/>unread badge update"]
```

Three independent consumer groups subscribe to the same event stream — this is the concrete
proof of the fan-out: adding a fourth consumer (e.g. Slack) requires zero changes to the
task service, only a new consumer group.

**Why Kafka instead of a direct call**: the task mutation completes the instant the DB row
is written; it never blocks on — or fails because of — a slow SMTP server or a Socket.io
emit. All publishes from `task.service.ts` are deliberately fire-and-forget
(`void publishTaskAssigned(...)`), and every publish is wrapped in a try/catch so a Kafka
hiccup degrades to "no notification" rather than failing the user's request.

---

## 6. File Upload / Attachment Flow

```mermaid
graph LR
    U[Client] -->|"multipart/form-data<br/>POST /tasks/:id/attachments"| M["multer middleware<br/>MIME allowlist + 5MB limit"]
    M -->|"reject: 400/413"| U
    M -->|"disk write<br/>src/uploads/{uuid}.ext"| DISK[(Local Disk)]
    M --> FC[File Controller]
    FC --> FS["File Service<br/>(permission check:<br/>Admin or owning Employee)"]
    FS -->|"on permission failure,<br/>unlink the just-written file"| DISK
    FS -->|INSERT| DB[(files table)]
    FS -->|201| U

    U2[Client] -->|"GET /attachments/:id/download<br/>Authorization: Bearer"| DC["Download Controller<br/>(same access rule as parent task)"]
    DC -->|"res.download()<br/>streamed, never express.static"| U2
```

Attachments are never served through `express.static` — every download goes through the
authenticated controller so the same Admin-or-owning-Employee rule that governs the parent
task also governs its files.

---

## 7. Frontend State & Data Flow

```mermaid
graph TB
    UI["React Components"] --> RTK["RTK Query hooks<br/>(useListTasksQuery, useCreateTaskMutation, ...)"]
    RTK --> BQ["axiosBaseQuery"]
    BQ --> AX["Shared axios instance<br/>(withCredentials, XSRF header)"]
    AX -->|"401 response"| INT["Response interceptor"]
    INT --> RS["refreshSession()<br/>(single deduped in-flight promise)"]
    RS -->|"success: retry original request"| AX
    RS -->|"failure: clear session"| STORE

    AX --> API[Express API]

    SOCKET["Socket.io client<br/>useNotificationSocket"] -->|"notification:new"| RTK
    RTK -->|invalidatesTags / providesTags| CACHE["RTK Query cache"]
    CACHE --> UI

    STORE["Redux store<br/>(auth slice: user, accessToken)"] --> UI
```

**Why one deduped `refreshSession()`**: both the axios 401-interceptor and the app-boot
silent-login hook (`useAuthBootstrap`) can trigger `POST /auth/refresh`. Two concurrent
calls would otherwise race on the same not-yet-rotated cookie — the first rotates and
revokes it, the second arrives holding an already-revoked token and trips theft-detection,
revoking the session it just legitimately established. This was a real bug caught via
Playwright browser testing (not just curl) early in the project; see `docs/PROJECT_PLAN.md`
Phase 1 notes for the full story.

---

## Related documents

- [`docs/PROJECT_PLAN.md`](./PROJECT_PLAN.md) — full phase-by-phase build log with verification evidence for every feature
- [`docs/database.sql`](./database.sql) — standalone SQL schema + seed data script
- `E-Management-Backend/prisma/schema.prisma` — Prisma schema (source of truth for the DB)
- `http://localhost:5001/api-docs` — Swagger/OpenAPI interactive API reference (when the backend is running)
