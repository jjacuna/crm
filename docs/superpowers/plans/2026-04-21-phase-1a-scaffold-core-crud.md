# Phase 1a: Scaffold + Core CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working Dr. AI CRM with contacts + workshops CRUD, session auth, dark theme UI, deployed to Railway.

**Architecture:** Express.js API serves a React SPA. Prisma ORM talks to Postgres. Redis backs express-session. Docker packages both web and worker services. Cloudflare Zero Trust wraps the public URL.

**Tech Stack:** TypeScript, Express, React 19, Vite, Prisma, PostgreSQL, Redis, Tailwind CSS v4, shadcn/ui, Docker, Railway

**Spec:** `docs/superpowers/specs/2026-04-21-dr-ai-crm-rebuild-design.md`

---

## File Structure

```
dr-ai-crm/
├── package.json                    # Root workspace config
├── tsconfig.json                   # Shared TS config
├── docker-compose.yml              # Local dev: postgres + redis
├── Dockerfile                      # Production multi-stage build
├── railway.json                    # Railway deploy config
├── .env.example                    # Env var template
├── .gitignore
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # Express app entry + WebSocket setup
│   │   ├── config.ts               # Env var loading + validation
│   │   ├── auth/
│   │   │   ├── middleware.ts        # Session auth + CF Zero Trust middleware
│   │   │   └── routes.ts           # POST /login, /logout, GET /me
│   │   ├── contacts/
│   │   │   ├── routes.ts           # CRUD routes
│   │   │   └── service.ts          # Prisma queries
│   │   ├── workshops/
│   │   │   ├── routes.ts           # CRUD routes
│   │   │   └── service.ts          # Prisma queries
│   │   └── lib/
│   │       └── prisma.ts           # Prisma client singleton
│   └── tests/
│       ├── setup.ts                # Test helpers, DB reset
│       ├── auth.test.ts
│       ├── contacts.test.ts
│       └── workshops.test.ts
│
├── prisma/
│   └── schema.prisma               # All models
│
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── src/
    │   ├── main.tsx                 # React entry
    │   ├── App.tsx                  # Router setup
    │   ├── lib/
    │   │   ├── api.ts              # Fetch wrapper for API calls
    │   │   └── utils.ts            # cn() helper, formatters
    │   ├── components/
    │   │   ├── ui/                  # shadcn components (Button, Input, Table, etc.)
    │   │   ├── layout/
    │   │   │   ├── AppLayout.tsx    # Sidebar + header + main content
    │   │   │   └── Sidebar.tsx      # Navigation sidebar
    │   │   └── shared/
    │   │       ├── StatusBadge.tsx  # Colored status badges
    │   │       └── DataTable.tsx    # Reusable table component
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── contacts/
    │   │   │   ├── ContactsListPage.tsx
    │   │   │   └── ContactDetailPage.tsx
    │   │   └── workshops/
    │   │       ├── WorkshopsListPage.tsx
    │   │       └── WorkshopDetailPage.tsx
    │   └── hooks/
    │       ├── useAuth.tsx          # Auth context + login/logout
    │       └── useApi.ts           # React Query wrapper hooks
    └── tests/
        └── e2e/
            └── workshop-flow.spec.ts  # Playwright E2E
```

---

### Task 1: Project Scaffold + Tooling

**Files:**
- Create: `package.json` (root workspace)
- Create: `server/package.json`
- Create: `client/package.json`
- Create: `tsconfig.json` (root)
- Create: `server/tsconfig.json`
- Create: `client/tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`

- [ ] **Step 1: Initialize root workspace**

```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM"
```

Create `package.json`:
```json
{
  "name": "dr-ai-crm",
  "private": true,
  "workspaces": ["server", "client"],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "npm run build:client && npm run build:server",
    "build:server": "cd server && npm run build",
    "build:client": "cd client && npm run build",
    "test": "cd server && npm test",
    "test:e2e": "cd client && npx playwright test",
    "db:migrate": "npx prisma migrate dev",
    "db:push": "npx prisma db push",
    "db:studio": "npx prisma studio",
    "start": "cd server && npm start"
  },
  "devDependencies": {
    "concurrently": "^9.1.2",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Create server/package.json**

```json
{
  "name": "@dr-ai-crm/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@prisma/client": "^6.6.0",
    "bcrypt": "^5.1.1",
    "connect-redis": "^8.0.1",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "ioredis": "^5.6.1",
    "jose": "^6.0.11",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "supertest": "^7.1.0",
    "@types/supertest": "^6.0.2",
    "@types/express-session": "^1.18.1",
    "prisma": "^6.6.0",
    "tsx": "^4.19.4",
    "vitest": "^3.1.3"
  }
}
```

- [ ] **Step 4: Create client/package.json**

```json
{
  "name": "@dr-ai-crm/client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@tanstack/react-query": "^5.75.5",
    "@tanstack/react-table": "^8.21.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.503.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.56.1",
    "react-router-dom": "^7.5.3",
    "tailwind-merge": "^3.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "@tailwindcss/vite": "^4.1.4",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "tailwindcss": "^4.1.4",
    "vite": "^6.3.3"
  }
}
```

- [ ] **Step 5: Create server/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022"
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create client/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
.env
*.local
.DS_Store
```

- [ ] **Step 6: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dr_ai_crm

# Redis
REDIS_URL=redis://localhost:6379

# Auth
SESSION_SECRET=change-me-to-random-64-char-string
ADMIN_EMAIL=jonathan@simpletechskills.com
ADMIN_PASSWORD=change-me

# Stripe (two accounts)
STRIPE_SECRET_KEY_COMMUNITY=sk_test_...
STRIPE_WEBHOOK_SECRET_COMMUNITY=whsec_...
STRIPE_SECRET_KEY_CONSULTING=sk_test_...
STRIPE_WEBHOOK_SECRET_CONSULTING=whsec_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@simpletechskills.com

# AI
OPENROUTER_API_KEY=sk-or-...

# Kit
KIT_API_KEY=...

# Cloudflare Zero Trust
CF_ACCESS_TEAM_DOMAIN=simpletechskills.cloudflareaccess.com
CF_ACCESS_AUD=...

# App
PORT=3000
NODE_ENV=development
```

- [ ] **Step 7: Create docker-compose.yml for local dev**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: dr_ai_crm
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 8: Install dependencies**

```bash
npm install
```

- [ ] **Step 9: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Dr. AI CRM monorepo with server + client workspaces"
```

---

### Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `server/src/lib/prisma.ts`

- [ ] **Step 1: Create Prisma schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Contact {
  id              String   @id @default(uuid())
  firstName       String   @map("first_name")
  lastName        String?  @map("last_name")
  email           String   @unique
  phone           String?
  leadSource      String?  @map("lead_source")
  contactType     String   @default("lead") @map("contact_type")
  funnelStage     String   @default("lead") @map("funnel_stage")
  status          String   @default("active")
  leadScore       Int      @default(0) @map("lead_score")
  stripeCustomerId String? @map("stripe_customer_id")
  kitSubscriberId  String? @map("kit_subscriber_id")
  tags            String[] @default([])
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  registrations   WorkshopRegistration[]
  sessions        CoachingSession[]
  payments        Payment[]
  subscriptions   Subscription[]
  activities      ActivityLog[]
  knowledgeFile   ClientKnowledgeFile?
  emailLogs       EmailLog[]

  @@map("contacts")
}

model Workshop {
  id              String   @id @default(uuid())
  title           String
  date            DateTime
  zoomLink        String?  @map("zoom_link")
  status          String   @default("upcoming")
  maxCapacity     Int      @default(50) @map("max_capacity")
  stripeProductId String?  @map("stripe_product_id")
  priceCents      Int      @default(25000) @map("price_cents")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  registrations   WorkshopRegistration[]
  emailLogs       EmailLog[]

  @@map("workshops")
}

model WorkshopRegistration {
  id              String   @id @default(uuid())
  workshopId      String   @map("workshop_id")
  contactId       String   @map("contact_id")
  registeredAt    DateTime @default(now()) @map("registered_at")
  paymentStatus   String   @default("pending") @map("payment_status")
  stripePaymentId String?  @map("stripe_payment_id")
  attended        Boolean?
  surveyCompleted Boolean  @default(false) @map("survey_completed")
  source          String   @default("manual")
  notes           String?
  updatedAt       DateTime @updatedAt @map("updated_at")

  workshop        Workshop @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([workshopId, contactId])
  @@index([contactId])
  @@map("workshop_registrations")
}

model CoachingSession {
  id              String    @id @default(uuid())
  contactId       String    @map("contact_id")
  tier            String
  sessionNumber   Int       @map("session_number")
  scheduledAt     DateTime? @map("scheduled_at")
  completedAt     DateTime? @map("completed_at")
  transcript      String?
  summary         String?
  actionItems     Json?     @map("action_items")
  knowledgeFileUpdated Boolean @default(false) @map("knowledge_file_updated")
  fathomRecordingId String? @map("fathom_recording_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  contact         Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)
  emailLogs       EmailLog[]

  @@index([contactId])
  @@map("coaching_sessions")
}

model ClientKnowledgeFile {
  id              String    @id @default(uuid())
  contactId       String    @unique @map("contact_id")
  content         String    @default("")
  lastSessionDate DateTime? @map("last_session_date")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  contact         Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@map("client_knowledge_files")
}

model Payment {
  id              String   @id @default(uuid())
  contactId       String?  @map("contact_id")
  stripePaymentId String?  @unique @map("stripe_payment_id")
  stripeCustomerId String? @map("stripe_customer_id")
  amountCents     Int      @map("amount_cents")
  currency        String   @default("usd")
  productType     String?  @map("product_type")
  stripeAccount   String?  @map("stripe_account")
  status          String   @default("pending")
  createdAt       DateTime @default(now()) @map("created_at")

  contact         Contact? @relation(fields: [contactId], references: [id], onDelete: SetNull)

  @@index([contactId])
  @@map("payments")
}

model Subscription {
  id                    String    @id @default(uuid())
  contactId             String?   @map("contact_id")
  stripeSubscriptionId  String    @unique @map("stripe_subscription_id")
  stripeAccount         String    @map("stripe_account")
  productType           String?   @map("product_type")
  status                String    @default("active")
  currentPeriodStart    DateTime? @map("current_period_start")
  currentPeriodEnd      DateTime? @map("current_period_end")
  amountCents           Int       @map("amount_cents")
  currency              String    @default("usd")
  cancelledAt           DateTime? @map("cancelled_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  contact               Contact?  @relation(fields: [contactId], references: [id], onDelete: SetNull)

  @@index([contactId])
  @@map("subscriptions")
}

model EmailSequence {
  id              String   @id @default(uuid())
  name            String
  triggerType     String   @map("trigger_type")
  subject         String
  bodyHtml        String   @map("body_html")
  bodyText        String?  @map("body_text")
  delayMinutes    Int      @default(0) @map("delay_minutes")
  active          Boolean  @default(true)
  createdAt       DateTime @default(now()) @map("created_at")

  emailLogs       EmailLog[]

  @@map("email_sequences")
}

model EmailLog {
  id              String    @id @default(uuid())
  contactId       String?   @map("contact_id")
  sequenceId      String?   @map("sequence_id")
  workshopId      String?   @map("workshop_id")
  sessionId       String?   @map("session_id")
  sentAt          DateTime  @default(now()) @map("sent_at")
  resendMessageId String?   @map("resend_message_id")
  status          String    @default("sent")

  contact         Contact?        @relation(fields: [contactId], references: [id], onDelete: SetNull)
  sequence        EmailSequence?  @relation(fields: [sequenceId], references: [id], onDelete: SetNull)
  workshop        Workshop?       @relation(fields: [workshopId], references: [id], onDelete: SetNull)
  session         CoachingSession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)

  @@index([contactId])
  @@index([workshopId])
  @@map("email_log")
}

model ActivityLog {
  id              String   @id @default(uuid())
  contactId       String   @map("contact_id")
  action          String
  metadata        Json?
  createdAt       DateTime @default(now()) @map("created_at")

  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([contactId, createdAt(sort: Desc)])
  @@map("activity_log")
}
```

- [ ] **Step 2: Create Prisma client singleton**

Create `server/src/lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Start local Postgres + Redis and run migration**

```bash
docker compose up -d
cp .env.example .env  # Edit with local values
npx prisma migrate dev --name init
```

Expected: Migration creates all tables. Prisma Studio accessible via `npx prisma studio`.

- [ ] **Step 4: Commit**

```bash
git add prisma/ server/src/lib/prisma.ts
git commit -m "feat: add Prisma schema with all CRM tables + indexes"
```

---

### Task 3: Express Server + Config + Auth

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/auth/middleware.ts`
- Create: `server/src/auth/routes.ts`
- Create: `server/src/index.ts`
- Create: `server/tests/setup.ts`
- Create: `server/tests/auth.test.ts`

- [ ] **Step 1: Create config.ts**

Create `server/src/config.ts`:
```typescript
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SESSION_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CF_ACCESS_TEAM_DOMAIN: z.string().optional(),
  CF_ACCESS_AUD: z.string().optional(),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
```

- [ ] **Step 2: Write auth middleware test**

Create `server/tests/setup.ts`:
```typescript
import { beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

beforeAll(async () => {
  // Clean test database
  await prisma.$executeRawUnsafe('TRUNCATE TABLE contacts, workshops, activity_log CASCADE');
});

export { prisma };
```

Create `server/tests/auth.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes, initAuth } from "../src/auth/routes.js";
import { requireAuth } from "../src/auth/middleware.js";
import session from "express-session";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: "test-secret-that-is-long-enough-for-validation",
    resave: false,
    saveUninitialized: false,
  }));
  app.use("/api/auth", authRoutes);
  app.get("/api/protected", requireAuth, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("Auth", () => {
  let app: express.Express;

  beforeAll(async () => {
    process.env.ADMIN_EMAIL = "test@test.com";
    process.env.ADMIN_PASSWORD = "testpassword123";
    await initAuth("testpassword123");
    app = createTestApp();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/protected");
    expect(res.status).toBe(401);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "testpassword123" });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test@test.com");
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd server && npx vitest run tests/auth.test.ts
```
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement auth middleware + routes**

Create `server/src/auth/middleware.ts`:
```typescript
import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
```

Create `server/src/auth/routes.ts`:
```typescript
import { Router } from "express";
import bcrypt from "bcrypt";

const router = Router();

// In-memory hash generated at startup
let adminPasswordHash: string;

export async function initAuth(password: string) {
  adminPasswordHash = await bcrypt.hash(password, 12);
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  if (email !== adminEmail) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // For test env, compare directly; for prod, use bcrypt
  const valid = adminPasswordHash
    ? await bcrypt.compare(password, adminPasswordHash)
    : password === process.env.ADMIN_PASSWORD;

  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.userId = "admin";
  req.session.email = email;
  res.json({ email });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session?.email) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ email: req.session.email });
});

export { router as authRoutes };
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd server && npx vitest run tests/auth.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 6: Create Express app entry point**

Create `server/src/index.ts`:
```typescript
import express from "express";
import session from "express-session";
import RedisStore from "connect-redis";
import { Redis } from "ioredis";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { authRoutes, initAuth } from "./auth/routes.js";
import { requireAuth } from "./auth/middleware.js";
import { contactRoutes } from "./contacts/routes.js";
import { workshopRoutes } from "./workshops/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = express();
  const port = process.env.PORT ?? 3000;

  // Redis for sessions
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

  // Init admin password hash
  await initAuth(process.env.ADMIN_PASSWORD ?? "");

  // Middleware
  app.use(cors({
    origin: process.env.NODE_ENV === "development" ? "http://localhost:5173" : false,
    credentials: true,
  }));

  // Raw body for Stripe webhooks (must be before express.json)
  app.use("/api/webhooks", express.raw({ type: "application/json" }));
  app.use(express.json());

  app.use(session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    },
  }));

  // Auth routes (no auth required)
  app.use("/api/auth", authRoutes);

  // Protected API routes
  app.use("/api/contacts", requireAuth, contactRoutes);
  app.use("/api/workshops", requireAuth, workshopRoutes);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  // Serve React SPA in production
  if (process.env.NODE_ENV === "production") {
    const clientDist = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.listen(port, () => {
    console.log(`Dr. AI CRM server running on port ${port}`);
  });
}

main().catch(console.error);
```

- [ ] **Step 7: Commit**

```bash
git add server/src/ server/tests/
git commit -m "feat: add Express server with session auth, config, and health check"
```

---

### Task 4: Contacts CRUD API

**Files:**
- Create: `server/src/contacts/service.ts`
- Create: `server/src/contacts/routes.ts`
- Create: `server/tests/contacts.test.ts`

- [ ] **Step 1: Write contacts test**

Create `server/tests/contacts.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { contactsService } from "../src/contacts/service.js";

describe("Contacts Service", () => {
  beforeEach(async () => {
    await prisma.contact.deleteMany();
  });

  it("creates a contact", async () => {
    const contact = await contactsService.create({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      leadSource: "workshop",
    });
    expect(contact.id).toBeDefined();
    expect(contact.firstName).toBe("Test");
    expect(contact.contactType).toBe("lead");
    expect(contact.funnelStage).toBe("lead");
  });

  it("lists contacts with filtering", async () => {
    await contactsService.create({ firstName: "A", email: "a@test.com", leadSource: "tiktok" });
    await contactsService.create({ firstName: "B", email: "b@test.com", leadSource: "workshop" });

    const all = await contactsService.list({});
    expect(all.length).toBe(2);

    const filtered = await contactsService.list({ leadSource: "tiktok" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].firstName).toBe("A");
  });

  it("gets contact by id with relations", async () => {
    const created = await contactsService.create({ firstName: "C", email: "c@test.com" });
    const found = await contactsService.getById(created.id);
    expect(found?.email).toBe("c@test.com");
  });

  it("updates a contact", async () => {
    const created = await contactsService.create({ firstName: "D", email: "d@test.com" });
    const updated = await contactsService.update(created.id, { contactType: "student" });
    expect(updated.contactType).toBe("student");
  });

  it("soft deletes a contact", async () => {
    const created = await contactsService.create({ firstName: "E", email: "e@test.com" });
    await contactsService.softDelete(created.id);
    const found = await contactsService.getById(created.id);
    expect(found?.status).toBe("deleted");
    // Should not appear in list
    const list = await contactsService.list({});
    expect(list.length).toBe(0);
  });

  it("searches contacts by name or email", async () => {
    await contactsService.create({ firstName: "Jonathan", lastName: "Acuna", email: "j@test.com" });
    await contactsService.create({ firstName: "Other", email: "other@test.com" });

    const results = await contactsService.list({ search: "jonathan" });
    expect(results.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx vitest run tests/contacts.test.ts
```
Expected: FAIL — service not found.

- [ ] **Step 3: Implement contacts service**

Create `server/src/contacts/service.ts`:
```typescript
import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

interface ListFilters {
  leadSource?: string;
  contactType?: string;
  funnelStage?: string;
  status?: string;
  search?: string;
}

interface CreateContactInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  leadSource?: string;
  contactType?: string;
  tags?: string[];
}

export const contactsService = {
  async list(filters: ListFilters) {
    const where: Prisma.ContactWhereInput = {
      status: filters.status ?? "active",
    };

    if (filters.leadSource) where.leadSource = filters.leadSource;
    if (filters.contactType) where.contactType = filters.contactType;
    if (filters.funnelStage) where.funnelStage = filters.funnelStage;

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.contact.findUnique({
      where: { id },
      include: {
        registrations: { include: { workshop: true }, orderBy: { registeredAt: "desc" } },
        sessions: { orderBy: { scheduledAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        subscriptions: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 50 },
        knowledgeFile: true,
      },
    });
  },

  async create(data: CreateContactInput) {
    return prisma.contact.create({ data });
  },

  async update(id: string, data: Partial<CreateContactInput> & { contactType?: string; funnelStage?: string }) {
    return prisma.contact.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.contact.update({ where: { id }, data: { status: "deleted" } });
  },

  async findByEmail(email: string) {
    return prisma.contact.findUnique({ where: { email } });
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx vitest run tests/contacts.test.ts
```
Expected: PASS (6 tests)

- [ ] **Step 5: Create contacts routes**

Create `server/src/contacts/routes.ts`:
```typescript
import { Router } from "express";
import { contactsService } from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  const contacts = await contactsService.list({
    leadSource: req.query.leadSource as string,
    contactType: req.query.contactType as string,
    funnelStage: req.query.funnelStage as string,
    search: req.query.search as string,
  });
  res.json(contacts);
});

router.get("/:id", async (req, res) => {
  const contact = await contactsService.getById(req.params.id);
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json(contact);
});

router.post("/", async (req, res) => {
  const contact = await contactsService.create(req.body);
  res.status(201).json(contact);
});

router.patch("/:id", async (req, res) => {
  const contact = await contactsService.update(req.params.id, req.body);
  res.json(contact);
});

router.delete("/:id", async (req, res) => {
  await contactsService.softDelete(req.params.id);
  res.json({ ok: true });
});

export { router as contactRoutes };
```

- [ ] **Step 6: Commit**

```bash
git add server/src/contacts/ server/tests/contacts.test.ts
git commit -m "feat: add contacts CRUD with service layer, routes, and tests"
```

---

### Task 5: Workshops CRUD API

**Files:**
- Create: `server/src/workshops/service.ts`
- Create: `server/src/workshops/routes.ts`
- Create: `server/tests/workshops.test.ts`

- [ ] **Step 1: Write workshops test**

Create `server/tests/workshops.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { workshopsService } from "../src/workshops/service.js";
import { contactsService } from "../src/contacts/service.js";

describe("Workshops Service", () => {
  beforeEach(async () => {
    await prisma.workshopRegistration.deleteMany();
    await prisma.workshop.deleteMany();
    await prisma.contact.deleteMany();
  });

  it("creates a workshop", async () => {
    const workshop = await workshopsService.create({
      title: "Claude Code Vibe Coding",
      date: new Date("2026-04-26T14:00:00Z"),
      zoomLink: "https://zoom.us/j/123",
    });
    expect(workshop.id).toBeDefined();
    expect(workshop.status).toBe("upcoming");
    expect(workshop.priceCents).toBe(25000);
  });

  it("lists workshops by status", async () => {
    await workshopsService.create({ title: "Past", date: new Date("2026-01-01"), status: "completed" });
    await workshopsService.create({ title: "Future", date: new Date("2026-12-01") });

    const upcoming = await workshopsService.list("upcoming");
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].title).toBe("Future");
  });

  it("registers a contact for a workshop", async () => {
    const workshop = await workshopsService.create({ title: "W1", date: new Date() });
    const contact = await contactsService.create({ firstName: "Test", email: "t@t.com" });

    const reg = await workshopsService.register(workshop.id, contact.id, { source: "manual" });
    expect(reg.workshopId).toBe(workshop.id);
    expect(reg.contactId).toBe(contact.id);
    expect(reg.paymentStatus).toBe("pending");
  });

  it("gets workshop with registrations", async () => {
    const workshop = await workshopsService.create({ title: "W2", date: new Date() });
    const contact = await contactsService.create({ firstName: "A", email: "a@a.com" });
    await workshopsService.register(workshop.id, contact.id, { source: "stripe", paymentStatus: "paid" });

    const detail = await workshopsService.getById(workshop.id);
    expect(detail?.registrations.length).toBe(1);
    expect(detail?.registrations[0].contact.firstName).toBe("A");
  });

  it("marks attendance", async () => {
    const workshop = await workshopsService.create({ title: "W3", date: new Date() });
    const contact = await contactsService.create({ firstName: "B", email: "b@b.com" });
    const reg = await workshopsService.register(workshop.id, contact.id, {});

    await workshopsService.markAttendance(reg.id, true);
    const updated = await prisma.workshopRegistration.findUnique({ where: { id: reg.id } });
    expect(updated?.attended).toBe(true);
  });

  it("prevents duplicate registrations", async () => {
    const workshop = await workshopsService.create({ title: "W4", date: new Date() });
    const contact = await contactsService.create({ firstName: "C", email: "c@c.com" });
    await workshopsService.register(workshop.id, contact.id, {});

    await expect(
      workshopsService.register(workshop.id, contact.id, {})
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx vitest run tests/workshops.test.ts
```
Expected: FAIL — service not found.

- [ ] **Step 3: Implement workshops service**

Create `server/src/workshops/service.ts`:
```typescript
import { prisma } from "../lib/prisma.js";

interface CreateWorkshopInput {
  title: string;
  date: Date;
  zoomLink?: string;
  maxCapacity?: number;
  stripeProductId?: string;
  priceCents?: number;
  status?: string;
}

interface RegisterInput {
  source?: string;
  paymentStatus?: string;
  stripePaymentId?: string;
}

export const workshopsService = {
  async list(status?: string) {
    return prisma.workshop.findMany({
      where: status ? { status } : undefined,
      orderBy: { date: "desc" },
      include: {
        _count: { select: { registrations: true } },
      },
    });
  },

  async getById(id: string) {
    return prisma.workshop.findUnique({
      where: { id },
      include: {
        registrations: {
          include: { contact: true },
          orderBy: { registeredAt: "desc" },
        },
      },
    });
  },

  async create(data: CreateWorkshopInput) {
    return prisma.workshop.create({ data });
  },

  async update(id: string, data: Partial<CreateWorkshopInput>) {
    return prisma.workshop.update({ where: { id }, data });
  },

  async register(workshopId: string, contactId: string, input: RegisterInput) {
    return prisma.workshopRegistration.create({
      data: {
        workshopId,
        contactId,
        source: input.source ?? "manual",
        paymentStatus: input.paymentStatus ?? "pending",
        stripePaymentId: input.stripePaymentId,
      },
    });
  },

  async markAttendance(registrationId: string, attended: boolean) {
    return prisma.workshopRegistration.update({
      where: { id: registrationId },
      data: { attended },
    });
  },

  async getRegistrationCount(workshopId: string) {
    return prisma.workshopRegistration.count({ where: { workshopId } });
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx vitest run tests/workshops.test.ts
```
Expected: PASS (6 tests)

- [ ] **Step 5: Create workshops routes**

Create `server/src/workshops/routes.ts`:
```typescript
import { Router } from "express";
import { workshopsService } from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  const workshops = await workshopsService.list(req.query.status as string);
  res.json(workshops);
});

router.get("/:id", async (req, res) => {
  const workshop = await workshopsService.getById(req.params.id);
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }
  res.json(workshop);
});

router.post("/", async (req, res) => {
  const workshop = await workshopsService.create(req.body);
  res.status(201).json(workshop);
});

router.patch("/:id", async (req, res) => {
  const workshop = await workshopsService.update(req.params.id, req.body);
  res.json(workshop);
});

router.post("/:id/register", async (req, res) => {
  const { contactId, ...input } = req.body;
  const reg = await workshopsService.register(req.params.id, contactId, input);
  res.status(201).json(reg);
});

router.patch("/registrations/:regId/attendance", async (req, res) => {
  const reg = await workshopsService.markAttendance(req.params.regId, req.body.attended);
  res.json(reg);
});

export { router as workshopRoutes };
```

- [ ] **Step 6: Commit**

```bash
git add server/src/workshops/ server/tests/workshops.test.ts
git commit -m "feat: add workshops CRUD with registration, attendance, and tests"
```

---

### Task 6: React Client Scaffold + Login Page

**Files:**
- Create: `client/index.html`
- Create: `client/vite.config.ts`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/lib/api.ts`
- Create: `client/src/lib/utils.ts`
- Create: `client/src/hooks/useAuth.tsx`
- Create: `client/src/pages/LoginPage.tsx`
- Create: `client/src/app.css`

- [ ] **Step 1: Create client scaffold files**

Create `client/index.html`:
```html
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dr. AI CRM</title>
</head>
<body class="bg-zinc-950 text-zinc-100">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

Create `client/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
```

Create `client/src/app.css`:
```css
@import "tailwindcss";

@theme {
  --color-gold: #D4AF37;
  --color-gold-light: #E8C85A;
  --color-gold-dark: #A68B1B;
}
```

Create `client/src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Create `client/src/lib/api.ts`:
```typescript
const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

- [ ] **Step 2: Create auth hook**

Create `client/src/hooks/useAuth.tsx`:
```typescript
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";

interface AuthContext {
  email: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ email: string }>("/auth/me")
      .then((u) => setEmail(u.email))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ email: string }>("/auth/login", { email, password });
    setEmail(res.email);
  };

  const logout = async () => {
    await api.post("/auth/logout", {});
    setEmail(null);
  };

  return (
    <AuthCtx.Provider value={{ email, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
```

- [ ] **Step 3: Create LoginPage**

Create `client/src/pages/LoginPage.tsx`:
```tsx
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm p-8 bg-zinc-900 rounded-xl border border-zinc-800">
        <h1 className="text-2xl font-bold text-gold mb-1">Doctor AI</h1>
        <p className="text-zinc-400 text-sm mb-6">Sign in to your CRM</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:border-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:border-gold focus:outline-none"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gold text-zinc-950 font-semibold rounded-lg hover:bg-gold-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create App.tsx with routing and main.tsx**

Create `client/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ContactsListPage } from "@/pages/contacts/ContactsListPage";
import { ContactDetailPage } from "@/pages/contacts/ContactDetailPage";
import { WorkshopsListPage } from "@/pages/workshops/WorkshopsListPage";
import { WorkshopDetailPage } from "@/pages/workshops/WorkshopDetailPage";
import { AppLayout } from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { email, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>;
  if (!email) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/contacts" element={<ContactsListPage />} />
              <Route path="/contacts/:id" element={<ContactDetailPage />} />
              <Route path="/workshops" element={<WorkshopsListPage />} />
              <Route path="/workshops/:id" element={<WorkshopDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

Create `client/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Commit**

```bash
git add client/
git commit -m "feat: add React client scaffold with auth, routing, and login page"
```

---

### Task 7: Layout + Dashboard + Contacts Pages

**Files:**
- Create: `client/src/components/layout/AppLayout.tsx`
- Create: `client/src/components/layout/Sidebar.tsx`
- Create: `client/src/components/shared/StatusBadge.tsx`
- Create: `client/src/pages/DashboardPage.tsx`
- Create: `client/src/pages/contacts/ContactsListPage.tsx`
- Create: `client/src/pages/contacts/ContactDetailPage.tsx`
- Create: `client/src/hooks/useApi.ts`

- [ ] **Step 1: Create layout components**

Create `client/src/components/layout/Sidebar.tsx`:
```tsx
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Dashboard", icon: "grid" },
  { to: "/contacts", label: "Contacts", icon: "users" },
  { to: "/workshops", label: "Workshops", icon: "calendar" },
];

export function Sidebar() {
  const { logout, email } = useAuth();

  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-gold">Doctor AI</h1>
        <p className="text-xs text-zinc-500">CRM</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gold/10 text-gold"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 truncate mb-2">{email}</p>
        <button
          onClick={() => logout()}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
```

Create `client/src/components/layout/AppLayout.tsx`:
```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create shared StatusBadge**

Create `client/src/components/shared/StatusBadge.tsx`:
```tsx
import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  active: "bg-green-900/50 text-green-400 border-green-800",
  lead: "bg-blue-900/50 text-blue-400 border-blue-800",
  student: "bg-purple-900/50 text-purple-400 border-purple-800",
  client: "bg-gold/10 text-gold border-gold/30",
  paid: "bg-green-900/50 text-green-400 border-green-800",
  pending: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  upcoming: "bg-blue-900/50 text-blue-400 border-blue-800",
  completed: "bg-zinc-800 text-zinc-400 border-zinc-700",
  refunded: "bg-red-900/50 text-red-400 border-red-800",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn(
      "inline-flex px-2 py-0.5 text-xs font-medium rounded-full border",
      colors[value] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"
    )}>
      {value}
    </span>
  );
}
```

- [ ] **Step 3: Create API hooks**

Create `client/src/hooks/useApi.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Contacts
export function useContacts(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters).toString();
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: () => api.get(`/contacts${params ? `?${params}` : ""}`),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: () => api.get(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/contacts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/contacts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", id] });
    },
  });
}

// Workshops
export function useWorkshops(status?: string) {
  return useQuery({
    queryKey: ["workshops", status],
    queryFn: () => api.get(`/workshops${status ? `?status=${status}` : ""}`),
  });
}

export function useWorkshop(id: string) {
  return useQuery({
    queryKey: ["workshops", id],
    queryFn: () => api.get(`/workshops/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/workshops", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workshops"] }),
  });
}
```

- [ ] **Step 4: Create DashboardPage**

Create `client/src/pages/DashboardPage.tsx`:
```tsx
import { useContacts, useWorkshops } from "@/hooks/useApi";

export function DashboardPage() {
  const { data: contacts } = useContacts();
  const { data: workshops } = useWorkshops("upcoming");

  const contactList = (contacts ?? []) as Array<Record<string, unknown>>;
  const workshopList = (workshops ?? []) as Array<Record<string, unknown>>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-500">Total Contacts</p>
          <p className="text-3xl font-bold text-zinc-100">{contactList.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-500">Upcoming Workshops</p>
          <p className="text-3xl font-bold text-gold">{workshopList.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-500">Students</p>
          <p className="text-3xl font-bold text-zinc-100">
            {contactList.filter((c) => c.contactType === "student").length}
          </p>
        </div>
      </div>

      {workshopList.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">Upcoming Workshops</h2>
          <div className="space-y-2">
            {workshopList.map((w) => (
              <div key={w.id as string} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                <span className="text-zinc-300">{w.title as string}</span>
                <span className="text-sm text-zinc-500">
                  {new Date(w.date as string).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create ContactsListPage**

Create `client/src/pages/contacts/ContactsListPage.tsx`:
```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useContacts, useCreateContact } from "@/hooks/useApi";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function ContactsListPage() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useContacts(search ? { search } : undefined);
  const createContact = useCreateContact();
  const [showForm, setShowForm] = useState(false);

  const contactList = (contacts ?? []) as Array<Record<string, unknown>>;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createContact.mutateAsync({
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
      leadSource: form.get("leadSource"),
    });
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Contacts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gold text-zinc-950 font-semibold rounded-lg hover:bg-gold-light transition-colors text-sm"
        >
          + New Contact
        </button>
      </div>

      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 mb-4 focus:border-gold focus:outline-none"
      />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <input name="firstName" placeholder="First name" required className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100" />
          <input name="lastName" placeholder="Last name" className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100" />
          <input name="email" type="email" placeholder="Email" required className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100" />
          <select name="leadSource" className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100">
            <option value="">Lead source...</option>
            <option value="tiktok">TikTok</option>
            <option value="workshop">Workshop</option>
            <option value="youtube">YouTube</option>
            <option value="referral">Referral</option>
            <option value="linkedin">LinkedIn</option>
            <option value="cold_outreach">Cold Outreach</option>
            <option value="other">Other</option>
          </select>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-zinc-950 font-semibold rounded-lg text-sm">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-zinc-400 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Source</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody>
              {contactList.map((c) => (
                <tr key={c.id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/contacts/${c.id}`} className="text-zinc-100 hover:text-gold transition-colors font-medium">
                      {c.firstName as string} {c.lastName as string}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{c.email as string}</td>
                  <td className="px-4 py-3"><StatusBadge value={c.contactType as string} /></td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{(c.leadSource as string) ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{c.leadScore as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create ContactDetailPage**

Create `client/src/pages/contacts/ContactDetailPage.tsx`:
```tsx
import { useParams, Link } from "react-router-dom";
import { useContact } from "@/hooks/useApi";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: contact, isLoading } = useContact(id!);

  if (isLoading) return <p className="text-zinc-500">Loading...</p>;
  if (!contact) return <p className="text-zinc-500">Contact not found</p>;

  const c = contact as Record<string, unknown>;
  const registrations = (c.registrations ?? []) as Array<Record<string, unknown>>;
  const payments = (c.payments ?? []) as Array<Record<string, unknown>>;
  const activities = (c.activities ?? []) as Array<Record<string, unknown>>;

  return (
    <div>
      <Link to="/contacts" className="text-sm text-zinc-500 hover:text-gold mb-4 inline-block">&larr; Back to contacts</Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-lg">
          {(c.firstName as string)?.[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{c.firstName as string} {c.lastName as string}</h1>
          <p className="text-zinc-400 text-sm">{c.email as string}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <StatusBadge value={c.contactType as string} />
          <StatusBadge value={c.funnelStage as string} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Lead Score</p>
          <p className="text-2xl font-bold text-gold">{c.leadScore as number}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Lead Source</p>
          <p className="text-lg text-zinc-100">{(c.leadSource as string) ?? "Unknown"}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Since</p>
          <p className="text-lg text-zinc-100">{new Date(c.createdAt as string).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Workshops */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Workshop History</h2>
        {registrations.length === 0 ? (
          <p className="text-zinc-500 text-sm">No workshops attended</p>
        ) : (
          <div className="space-y-2">
            {registrations.map((r) => {
              const w = r.workshop as Record<string, unknown>;
              return (
                <div key={r.id as string} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-zinc-300">{w.title as string}</span>
                  <div className="flex gap-2 items-center">
                    <StatusBadge value={r.paymentStatus as string} />
                    {r.attended === true && <span className="text-green-400 text-xs">Attended</span>}
                    {r.attended === false && <span className="text-red-400 text-xs">No-show</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-zinc-500 text-sm">No payments</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id as string} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                <span className="text-zinc-300">${((p.amountCents as number) / 100).toFixed(2)} — {p.productType as string}</span>
                <StatusBadge value={p.status as string} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Activity Timeline</h2>
        {activities.length === 0 ? (
          <p className="text-zinc-500 text-sm">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id as string} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                <span className="text-zinc-300 text-sm">{a.action as string}</span>
                <span className="text-zinc-500 text-xs">
                  {new Date(a.createdAt as string).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/
git commit -m "feat: add layout, dashboard, contacts list + detail pages with dark theme"
```

---

### Task 8: Workshop Pages

**Files:**
- Create: `client/src/pages/workshops/WorkshopsListPage.tsx`
- Create: `client/src/pages/workshops/WorkshopDetailPage.tsx`

- [ ] **Step 1: Create WorkshopsListPage**

Create `client/src/pages/workshops/WorkshopsListPage.tsx`:
```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkshops, useCreateWorkshop } from "@/hooks/useApi";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function WorkshopsListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: workshops, isLoading } = useWorkshops(statusFilter || undefined);
  const createWorkshop = useCreateWorkshop();
  const [showForm, setShowForm] = useState(false);

  const list = (workshops ?? []) as Array<Record<string, unknown>>;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createWorkshop.mutateAsync({
      title: form.get("title"),
      date: new Date(form.get("date") as string).toISOString(),
      zoomLink: form.get("zoomLink"),
    });
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Workshops</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gold text-zinc-950 font-semibold rounded-lg hover:bg-gold-light transition-colors text-sm"
        >
          + New Workshop
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {["", "upcoming", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-sm ${
              statusFilter === s ? "bg-gold/10 text-gold border border-gold/30" : "text-zinc-400 border border-zinc-800"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3">
          <input name="title" placeholder="Workshop title" required className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100" />
          <input name="date" type="datetime-local" required className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100" />
          <input name="zoomLink" placeholder="Zoom link" className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100" />
          <div className="col-span-3 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-zinc-950 font-semibold rounded-lg text-sm">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-zinc-400 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : (
        <div className="grid gap-3">
          {list.map((w) => {
            const count = (w._count as Record<string, number>)?.registrations ?? 0;
            return (
              <Link
                key={w.id as string}
                to={`/workshops/${w.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-gold/30 transition-colors flex justify-between items-center"
              >
                <div>
                  <h3 className="text-zinc-100 font-medium">{w.title as string}</h3>
                  <p className="text-sm text-zinc-500">{new Date(w.date as string).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-sm">{count} registered</span>
                  <StatusBadge value={w.status as string} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create WorkshopDetailPage**

Create `client/src/pages/workshops/WorkshopDetailPage.tsx`:
```tsx
import { useParams, Link } from "react-router-dom";
import { useWorkshop } from "@/hooks/useApi";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshop(id!);
  const qc = useQueryClient();

  if (isLoading) return <p className="text-zinc-500">Loading...</p>;
  if (!workshop) return <p className="text-zinc-500">Workshop not found</p>;

  const w = workshop as Record<string, unknown>;
  const registrations = (w.registrations ?? []) as Array<Record<string, unknown>>;

  const toggleAttendance = async (regId: string, attended: boolean | null) => {
    const next = attended === true ? false : attended === false ? null : true;
    await api.patch(`/workshops/registrations/${regId}/attendance`, { attended: next });
    qc.invalidateQueries({ queryKey: ["workshops", id] });
  };

  return (
    <div>
      <Link to="/workshops" className="text-sm text-zinc-500 hover:text-gold mb-4 inline-block">&larr; Back to workshops</Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{w.title as string}</h1>
          <p className="text-zinc-400">{new Date(w.date as string).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
        </div>
        <StatusBadge value={w.status as string} />
      </div>

      {w.zoomLink && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-zinc-500 mb-1">Zoom Link</p>
          <p className="text-zinc-300 text-sm break-all">{w.zoomLink as string}</p>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Registrations ({registrations.length})</h2>
        </div>

        {registrations.length === 0 ? (
          <p className="text-zinc-500 text-sm">No registrations yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">Email</th>
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">Payment</th>
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">Attended</th>
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const contact = r.contact as Record<string, unknown>;
                return (
                  <tr key={r.id as string} className="border-b border-zinc-800/50">
                    <td className="px-4 py-3">
                      <Link to={`/contacts/${contact.id}`} className="text-zinc-100 hover:text-gold font-medium">
                        {contact.firstName as string} {contact.lastName as string}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{contact.email as string}</td>
                    <td className="px-4 py-3"><StatusBadge value={r.paymentStatus as string} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAttendance(r.id as string, r.attended as boolean | null)}
                        className="text-sm px-2 py-1 rounded border border-zinc-700 hover:border-gold/30 transition-colors"
                      >
                        {r.attended === true ? <span className="text-green-400">Yes</span> :
                         r.attended === false ? <span className="text-red-400">No</span> :
                         <span className="text-zinc-500">?</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-sm">{r.source as string}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/workshops/
git commit -m "feat: add workshop list + detail pages with registration tracking"
```

---

### Task 9: Docker + Railway Deployment Config

**Files:**
- Create: `Dockerfile`
- Create: `railway.json`
- Create: `server/tsconfig.json` (update for build output)

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY prisma/ ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist/ ./server/dist/
COPY --from=builder /app/client/dist/ ./client/dist/
COPY --from=builder /app/prisma/ ./prisma/
COPY --from=builder /app/node_modules/ ./node_modules/

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node server/dist/index.js"]
```

- [ ] **Step 2: Create railway.json**

Create `railway.json`:
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && node server/dist/index.js",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile railway.json
git commit -m "feat: add Docker + Railway deployment configuration"
```

---

### Task 10: Verify Everything Works Locally

- [ ] **Step 1: Start local services**

```bash
docker compose up -d
cp .env.example .env
# Edit .env with local credentials
npx prisma migrate dev --name init
```

- [ ] **Step 2: Run all tests**

```bash
cd server && npx vitest run
```
Expected: All tests pass (auth: 3, contacts: 6, workshops: 6 = 15 total)

- [ ] **Step 3: Start dev servers**

```bash
npm run dev
```
Expected: Express on :3000, Vite on :5173. Login page at localhost:5173/login.

- [ ] **Step 4: Manual smoke test**
- Login with ADMIN_EMAIL/ADMIN_PASSWORD
- Create a contact from the contacts page
- Create a workshop from the workshops page
- View contact detail with empty timeline
- View workshop detail with empty registrations

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1a complete - scaffold, CRUD, auth, UI, deployment config"
```
