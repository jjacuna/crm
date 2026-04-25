# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Express + Prisma + Postgres server with ironclad auth (Argon2 + TOTP 2FA), client list, dashboard, knowledge file editor, and Railway deployment with example data.

**Architecture:** Extend the existing Express/Prisma server and React/Shadcn client. Upgrade auth from bcrypt to Argon2 + TOTP. Add security middleware (Helmet, rate limiting, CSRF). Rebuild Prisma schema to match design spec. Add Tiptap markdown editor for client knowledge files.

**Tech Stack:** Express, Prisma, PostgreSQL, Redis, Argon2, otpauth (TOTP), Helmet, express-rate-limit, React 19, Shadcn UI, Tailwind v4, Tiptap, React Query, React Router v7

**Spec:** `docs/superpowers/specs/2026-04-25-dr-ai-crm-design.md`

---

## File Structure (Phase 1 scope)

### Server — New files
- `server/src/config.ts` — Extend with new env vars (TOTP_ENCRYPTION_KEY)
- `server/src/middleware/security.ts` — Helmet, CORS, CSRF
- `server/src/middleware/rateLimiter.ts` — Rate limiting for login + global
- `server/src/middleware/validate.ts` — Zod request validation helper
- `server/src/auth/totp.ts` — TOTP generation, verification, encryption
- `server/src/auth/routes.ts` — Extend with 2FA setup/verify endpoints
- `server/src/clients/service.ts` — New client service (replaces contacts)
- `server/src/clients/routes.ts` — Client CRUD + knowledge file
- `server/src/dashboard/routes.ts` — Dashboard stats + activity
- `server/src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt for TOTP secrets

### Server — Modified files
- `server/package.json` — Add argon2, otpauth, helmet, express-rate-limit, csrf-csrf, qrcode
- `server/src/index.ts` — Add security middleware, new routes, remove old contact routes
- `prisma/schema.prisma` — Full rewrite to match design spec

### Server — New test files
- `server/tests/auth.test.ts` — Rewrite for Argon2 + TOTP flow
- `server/tests/clients.test.ts` — Client CRUD + knowledge file
- `server/tests/security.test.ts` — Rate limiting, CSRF, headers

### Seed & Migration
- `prisma/seed.ts` — Example data (15 clients, knowledge files, activities)

### Client — New files
- `client/src/pages/ClientsPage.tsx` — Client list (replaces ContactsListPage)
- `client/src/pages/ClientDetailPage.tsx` — Client detail with tabbed knowledge file
- `client/src/pages/DashboardPage.tsx` — Rewrite with stats + activity feed
- `client/src/components/shared/MarkdownEditor.tsx` — Tiptap wrapper
- `client/src/components/shared/DataTable.tsx` — Reusable filterable/sortable table
- `client/src/components/shared/SearchFilter.tsx` — Search + filter bar
- `client/src/hooks/useClients.ts` — React Query hooks for client API
- `client/src/hooks/useDashboard.ts` — React Query hooks for dashboard API

### Client — Modified files
- `client/package.json` — Add tiptap packages
- `client/src/App.tsx` — Update routes
- `client/src/hooks/useAuth.tsx` — Add TOTP step to login flow
- `client/src/pages/LoginPage.tsx` — Add TOTP input step
- `client/src/components/layout/Sidebar.tsx` — Update nav items

### Deployment
- `Dockerfile` — Verify build works with new deps
- `railway.json` — Already exists, verify
- `.env.example` — Update with all Phase 1 env vars

---

## Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma` (full rewrite)

- [ ] **Step 1: Write the new Prisma schema**

Replace the entire schema with the Phase 1 models from the design spec:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  passwordHash   String    @map("password_hash")
  totpSecret     String?   @map("totp_secret")
  totpEnabled    Boolean   @default(false) @map("totp_enabled")
  firstName      String    @map("first_name")
  lastName       String    @map("last_name")
  role           Role      @default(ADMIN)
  lastLoginAt    DateTime? @map("last_login_at")
  loginAttempts  Int       @default(0) @map("login_attempts")
  lockedUntil    DateTime? @map("locked_until")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  activities Activity[]

  @@map("users")
}

enum Role {
  ADMIN
  TEAM_MEMBER
  READ_ONLY
}

model Client {
  id                String      @id @default(cuid())
  firstName         String      @map("first_name")
  lastName          String?     @map("last_name")
  email             String      @unique
  phone             String?
  company           String?
  title             String?
  source            LeadSource  @default(MANUAL)
  funnelStage       FunnelStage @default(LEAD) @map("funnel_stage")
  contactType       ContactType @default(LEAD) @map("contact_type")
  tags              String[]
  packageName       String?     @map("package_name")
  sessionsPurchased Int         @default(0) @map("sessions_purchased")
  sessionsUsed      Int         @default(0) @map("sessions_used")
  city              String?
  state             String?
  country           String?
  linkedinUrl       String?     @map("linkedin_url")
  websiteUrl        String?     @map("website_url")
  avatarUrl         String?     @map("avatar_url")
  circleId          String?     @map("circle_id")
  kitSubscriberId   String?     @map("kit_subscriber_id")
  isActive          Boolean     @default(true) @map("is_active")
  firstSeenAt       DateTime    @default(now()) @map("first_seen_at")
  lastSeenAt        DateTime    @default(now()) @map("last_seen_at")
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  knowledgeFile     ClientKnowledgeFile?
  activities        Activity[]
  tasks             Task[]
  funnelTransitions FunnelTransition[]

  @@map("clients")
}

enum LeadSource {
  TIKTOK
  YOUTUBE
  WORKSHOP
  REFERRAL
  LINKEDIN
  COLD_OUTREACH
  WEBSITE
  KIT
  CIRCLE
  MANUAL
  OTHER
}

enum FunnelStage {
  LEAD
  WORKSHOP_ATTENDEE
  COMMUNITY_MEMBER
  AI_CONSULTANT
  COACHING_CLIENT
}

enum ContactType {
  LEAD
  STUDENT
  CLIENT
  PARTNER
  CHURNED
}

model ClientKnowledgeFile {
  id        String @id @default(cuid())
  clientId  String @unique @map("client_id")
  client    Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  notes     String @default("") @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("client_knowledge_files")
}

model Task {
  id             String     @id @default(cuid())
  clientId       String?    @map("client_id")
  client         Client?    @relation(fields: [clientId], references: [id], onDelete: SetNull)
  title          String
  description    String?    @db.Text
  dueDate        DateTime?  @map("due_date")
  status         TaskStatus @default(PENDING)
  ticktickTaskId String?    @map("ticktick_task_id")
  createdAt      DateTime   @default(now()) @map("created_at")
  updatedAt      DateTime   @updatedAt @map("updated_at")

  @@map("tasks")
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELED
}

model FunnelTransition {
  id             String      @id @default(cuid())
  clientId       String      @map("client_id")
  client         Client      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  fromStage      FunnelStage @map("from_stage")
  toStage        FunnelStage @map("to_stage")
  changedBy      String?     @map("changed_by")
  notes          String?
  transitionedAt DateTime    @default(now()) @map("transitioned_at")

  @@map("funnel_transitions")
}

model Activity {
  id        String       @id @default(cuid())
  clientId  String?      @map("client_id")
  client    Client?      @relation(fields: [clientId], references: [id], onDelete: SetNull)
  userId    String?      @map("user_id")
  user      User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  type      ActivityType
  summary   String
  metadata  Json?
  createdAt DateTime     @default(now()) @map("created_at")

  @@index([clientId, createdAt])
  @@map("activities")
}

enum ActivityType {
  NOTE
  CALL
  EMAIL_SENT
  EMAIL_RECEIVED
  PAYMENT
  RECORDING_ADDED
  RECORDING_ASSIGNED
  TASK_CREATED
  STAGE_CHANGE
  TAG_ADDED
  SEQUENCE_ENROLLED
  LOGIN
  LOGIN_FAILED
}
```

- [ ] **Step 2: Generate migration**

Run: `cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM" && npx prisma migrate dev --name phase1_foundation --create-only`

Review the generated SQL to verify it drops old tables and creates new ones correctly.

- [ ] **Step 3: Apply migration and generate client**

Run: `npx prisma migrate dev`
Run: `npx prisma generate`

Expected: Migration applies successfully, Prisma client regenerated.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: rewrite Prisma schema for Dr. AI CRM Phase 1

New models: User (with TOTP fields), Client, ClientKnowledgeFile,
Task, FunnelTransition, Activity. Replaces old Contact/Workshop schema."
```

---

## Task 2: Install Server Dependencies & Security Middleware

**Files:**
- Modify: `server/package.json`
- Create: `server/src/middleware/security.ts`
- Create: `server/src/middleware/rateLimiter.ts`
- Create: `server/src/middleware/validate.ts`

- [ ] **Step 1: Install new dependencies**

Run:
```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM/server"
npm install argon2 otpauth qrcode helmet csrf-csrf express-rate-limit zod express-async-errors
npm install -D @types/qrcode
```

- [ ] **Step 2: Create security middleware**

Create `server/src/middleware/security.ts`:

```typescript
import helmet from "helmet";
import cors from "cors";
import { doubleCsrf } from "csrf-csrf";
import type { Express } from "express";

export function setupSecurity(app: Express, frontendUrl: string) {
  // Security headers
  app.use(helmet());

  // CORS — locked to frontend domain
  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
    })
  );

  // CSRF — double-submit cookie pattern
  // Skip for webhook routes (they use signature verification)
  const { doubleCsrfProtection, generateToken } = doubleCsrf({
    getSecret: () => process.env.SESSION_SECRET!,
    cookieName: "__csrf",
    cookieOptions: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    getTokenFromRequest: (req) =>
      req.headers["x-csrf-token"] as string,
  });

  // Apply CSRF to all routes except webhooks
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/webhooks")) return next();
    return doubleCsrfProtection(req, res, next);
  });

  // Expose CSRF token endpoint
  app.get("/api/csrf-token", (req, res) => {
    const token = generateToken(req, res);
    res.json({ token });
  });
}
```

- [ ] **Step 3: Create rate limiter**

Create `server/src/middleware/rateLimiter.ts`:

```typescript
import rateLimit from "express-rate-limit";
import type { Express } from "express";

// Login: 5 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global: 100 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function setupRateLimiting(app: Express) {
  app.use("/api/", globalLimiter);
  app.use("/api/auth/login", loginLimiter);
}
```

- [ ] **Step 4: Create Zod validation middleware**

Create `server/src/middleware/validate.ts`:

```typescript
import { type ZodSchema, ZodError } from "zod";
import type { Request, Response, NextFunction } from "express";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/ server/package.json server/package-lock.json
git commit -m "feat: add security middleware (Helmet, CORS, CSRF, rate limiting, Zod validation)"
```

---

## Task 3: Upgrade Auth to Argon2 + TOTP 2FA

**Files:**
- Create: `server/src/lib/crypto.ts`
- Create: `server/src/auth/totp.ts`
- Modify: `server/src/auth/routes.ts`
- Modify: `server/src/auth/middleware.ts`
- Modify: `server/src/config.ts`
- Test: `server/tests/auth.test.ts`

- [ ] **Step 1: Write crypto helper for TOTP secret encryption**

Create `server/src/lib/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key, "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string, key: string): string {
  const keyBuffer = Buffer.from(key, "hex");
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

- [ ] **Step 2: Write TOTP service**

Create `server/src/auth/totp.ts`:

```typescript
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { encrypt, decrypt } from "../lib/crypto.js";

const ISSUER = "Dr. AI CRM";

export function generateTotpSecret(email: string) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export async function generateQrCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

export function verifyTotp(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function encryptSecret(secret: string, encryptionKey: string): string {
  return encrypt(secret, encryptionKey);
}

export function decryptSecret(encrypted: string, encryptionKey: string): string {
  return decrypt(encrypted, encryptionKey);
}
```

- [ ] **Step 3: Update config.ts with new env vars**

**BREAKING CHANGE:** The existing `server/src/config.ts` exports `config`. This rewrite renames the export to `env`. All existing files that `import { config } from "../config.js"` must be updated to `import { env } from "../config.js"`. In practice, the auth and index rewrites in this plan handle this, and old contacts/workshops code is deleted in Task 13.

Modify `server/src/config.ts`:

```typescript
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  TOTP_ENCRYPTION_KEY: z.string().length(64, "Must be 32 bytes hex-encoded"),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
```

- [ ] **Step 4: Rewrite auth routes with Argon2 + TOTP**

Modify `server/src/auth/routes.ts`:

```typescript
import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "./middleware.js";
import {
  generateTotpSecret,
  generateQrCode,
  verifyTotp,
  encryptSecret,
  decryptSecret,
} from "./totp.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password, totpCode } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    res.status(429).json({
      error: `Account locked. Try again in ${minutesLeft} minutes.`,
    });
    return;
  }

  // Verify password
  const validPassword = await argon2.verify(user.passwordHash, password);
  if (!validPassword) {
    const attempts = user.loginAttempts + 1;
    const lockedUntil =
      attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000) // 15 min lockout
        : null;

    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: attempts, lockedUntil },
    });

    await prisma.activity.create({
      data: {
        userId: user.id,
        type: "LOGIN_FAILED",
        summary: `Failed login attempt ${attempts}`,
        metadata: { ip: req.ip },
      },
    });

    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Check TOTP if enabled
  if (user.totpEnabled) {
    if (!totpCode) {
      res.status(200).json({ requiresTotp: true });
      return;
    }

    const secret = decryptSecret(user.totpSecret!, env.TOTP_ENCRYPTION_KEY);
    if (!verifyTotp(secret, totpCode)) {
      res.status(401).json({ error: "Invalid 2FA code" });
      return;
    }
  }

  // Success — reset attempts, update session
  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  await prisma.activity.create({
    data: {
      userId: user.id,
      type: "LOGIN",
      summary: "Successful login",
      metadata: { ip: req.ip },
    },
  });

  req.session.userId = user.id;
  req.session.email = user.email;

  res.json({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    totpEnabled: user.totpEnabled,
  });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      totpEnabled: true,
    },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

// POST /api/auth/setup-2fa (requires auth)
router.post("/setup-2fa", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { secret, uri } = generateTotpSecret(user.email);
  const qrCode = await generateQrCode(uri);

  // Store encrypted secret temporarily (not enabled yet)
  const encrypted = encryptSecret(secret, env.TOTP_ENCRYPTION_KEY);
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: encrypted },
  });

  res.json({ qrCode, secret }); // secret shown once for manual entry
});

// POST /api/auth/verify-2fa (requires auth)
const verifyTotpSchema = z.object({ code: z.string().length(6) });

router.post(
  "/verify-2fa",
  requireAuth,
  validate(verifyTotpSchema),
  async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });

    if (!user || !user.totpSecret) {
      res.status(400).json({ error: "Run setup-2fa first" });
      return;
    }

    const secret = decryptSecret(user.totpSecret, env.TOTP_ENCRYPTION_KEY);
    if (!verifyTotp(secret, req.body.code)) {
      res.status(400).json({ error: "Invalid code. Try again." });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });

    res.json({ message: "2FA enabled successfully" });
  }
);

export default router;
```

- [ ] **Step 5: Update auth middleware for userId-based sessions**

Modify `server/src/auth/middleware.ts`:

```typescript
import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    email?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
```

- [ ] **Step 6: Write auth tests**

Rewrite `server/tests/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
// Tests will be run against the Express app
// Test setup creates a test user with Argon2 hash

describe("Auth", () => {
  describe("POST /api/auth/login", () => {
    it("returns 401 for invalid email", async () => {
      // test with wrong email
    });

    it("returns 401 for invalid password", async () => {
      // test with wrong password
    });

    it("returns requiresTotp:true when 2FA enabled and no code provided", async () => {
      // test TOTP flow
    });

    it("logs in successfully with valid credentials", async () => {
      // test full login
    });

    it("locks account after 5 failed attempts", async () => {
      // test lockout
    });
  });

  describe("POST /api/auth/setup-2fa", () => {
    it("returns QR code and secret", async () => {
      // test 2FA setup
    });
  });

  describe("POST /api/auth/verify-2fa", () => {
    it("enables 2FA with valid code", async () => {
      // test 2FA verification
    });
  });
});
```

Note: Full test implementations should use the app instance, create test users via Prisma, and verify the complete flow. The executing agent should write complete test bodies.

- [ ] **Step 7: Defer test execution**

**NOTE:** Auth tests require the Express app to be fully wired up (Task 6). Do NOT run tests yet. Tests will be run after Task 6 is complete.

- [ ] **Step 8: Commit**

```bash
git add server/src/auth/ server/src/lib/crypto.ts server/src/config.ts server/tests/
git commit -m "feat: upgrade auth to Argon2 + TOTP 2FA with account lockout

Replaces bcrypt with Argon2id. Adds TOTP 2FA setup/verify flow.
TOTP secrets encrypted at rest with AES-256-GCM.
Account locks after 5 failed attempts for 15 minutes."
```

---

## Task 4: Client CRUD API + Knowledge File

**Files:**
- Create: `server/src/clients/service.ts`
- Create: `server/src/clients/routes.ts`
- Test: `server/tests/clients.test.ts`

- [ ] **Step 1: Write client service**

Create `server/src/clients/service.ts`:

```typescript
import { prisma } from "../lib/prisma.js";
import type { Prisma } from "@prisma/client";

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  funnelStage?: string;
  contactType?: string;
  source?: string;
  tags?: string[];
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function listClients(params: ListParams) {
  const {
    page = 1,
    limit = 25,
    search,
    funnelStage,
    contactType,
    source,
    tags,
    isActive = true,
    sortBy = "lastSeenAt",
    sortOrder = "desc",
  } = params;

  const where: Prisma.ClientWhereInput = { isActive };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  if (funnelStage) where.funnelStage = funnelStage as any;
  if (contactType) where.contactType = contactType as any;
  if (source) where.source = source as any;
  if (tags?.length) where.tags = { hasSome: tags };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return { clients, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      knowledgeFile: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      tasks: {
        where: { status: { not: "CANCELED" } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createClient(data: Prisma.ClientCreateInput) {
  const client = await prisma.client.create({ data });

  // Auto-create empty knowledge file
  await prisma.clientKnowledgeFile.create({
    data: { clientId: client.id },
  });

  return client;
}

export async function updateClient(
  id: string,
  data: Prisma.ClientUpdateInput
) {
  return prisma.client.update({ where: { id }, data });
}

export async function softDeleteClient(id: string) {
  return prisma.client.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getKnowledgeFile(clientId: string) {
  return prisma.clientKnowledgeFile.findUnique({
    where: { clientId },
  });
}

export async function updateKnowledgeFile(
  clientId: string,
  notes: string
) {
  return prisma.clientKnowledgeFile.upsert({
    where: { clientId },
    update: { notes },
    create: { clientId, notes },
  });
}
```

- [ ] **Step 2: Write client routes**

Create `server/src/clients/routes.ts`:

```typescript
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import * as clientService from "./service.js";

const router = Router();

const createClientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  source: z.string().optional(),
  funnelStage: z.string().optional(),
  contactType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  packageName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

// GET /api/clients
router.get("/", async (req, res) => {
  const result = await clientService.listClients({
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 25, 100),
    search: req.query.search as string,
    funnelStage: req.query.funnelStage as string,
    contactType: req.query.contactType as string,
    source: req.query.source as string,
    tags: req.query.tags
      ? (req.query.tags as string).split(",")
      : undefined,
    isActive: req.query.isActive !== "false",
    sortBy: (req.query.sortBy as string) || "lastSeenAt",
    sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
  });
  res.json(result);
});

// GET /api/clients/:id
router.get("/:id", async (req, res) => {
  const client = await clientService.getClient(req.params.id);
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(client);
});

// POST /api/clients
router.post("/", validate(createClientSchema), async (req, res) => {
  const client = await clientService.createClient(req.body);
  res.status(201).json(client);
});

// PATCH /api/clients/:id
router.patch("/:id", validate(updateClientSchema), async (req, res) => {
  const client = await clientService.updateClient(req.params.id, req.body);
  res.json(client);
});

// DELETE /api/clients/:id
router.delete("/:id", async (req, res) => {
  await clientService.softDeleteClient(req.params.id);
  res.json({ message: "Client deactivated" });
});

// GET /api/clients/:id/knowledge
router.get("/:id/knowledge", async (req, res) => {
  const kf = await clientService.getKnowledgeFile(req.params.id);
  if (!kf) {
    res.status(404).json({ error: "Knowledge file not found" });
    return;
  }
  res.json(kf);
});

// PATCH /api/clients/:id/knowledge
const updateKnowledgeSchema = z.object({ notes: z.string() });

router.patch(
  "/:id/knowledge",
  validate(updateKnowledgeSchema),
  async (req, res) => {
    const kf = await clientService.updateKnowledgeFile(
      req.params.id,
      req.body.notes
    );
    res.json(kf);
  }
);

export default router;
```

- [ ] **Step 3: Write client tests**

Create complete tests in `server/tests/clients.test.ts` covering: list with pagination, search, filters, get by id, create, update, soft delete, knowledge file CRUD.

- [ ] **Step 4: Defer test execution**

**NOTE:** Client tests require the Express app to be fully wired up (Task 6). Tests will be run after Task 6.

- [ ] **Step 5: Commit**

```bash
git add server/src/clients/ server/tests/clients.test.ts
git commit -m "feat: add client CRUD API with knowledge file, search, filters, pagination"
```

---

## Task 5: Dashboard API

**Files:**
- Create: `server/src/dashboard/routes.ts`

- [ ] **Step 1: Write dashboard routes**

Create `server/src/dashboard/routes.ts`:

```typescript
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", async (_req, res) => {
  const [activeClients, totalClients, pendingTasks, recentActivities] =
    await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.client.count(),
      prisma.task.count({ where: { status: "PENDING" } }),
      prisma.activity.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  // Funnel breakdown
  const funnelBreakdown = await prisma.client.groupBy({
    by: ["funnelStage"],
    where: { isActive: true },
    _count: true,
  });

  res.json({
    activeClients,
    totalClients,
    pendingTasks,
    recentActivities,
    funnelBreakdown: funnelBreakdown.map((f) => ({
      stage: f.funnelStage,
      count: f._count,
    })),
  });
});

// GET /api/dashboard/activity
router.get("/activity", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });

  res.json(activities);
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/dashboard/
git commit -m "feat: add dashboard stats and activity feed API"
```

---

## Task 6: Wire Up Express Server

**Files:**
- Modify: `server/src/index.ts`
- Update: `.env.example`

- [ ] **Step 1: Rewrite server/src/index.ts**

Update `server/src/index.ts` to use new middleware and routes:

```typescript
import "dotenv/config";
import "express-async-errors"; // Must be imported before express to catch async route errors
import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { Redis } from "ioredis";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config.js";
import { setupSecurity } from "./middleware/security.js";
import { setupRateLimiting } from "./middleware/rateLimiter.js";
import { requireAuth } from "./auth/middleware.js";
import authRoutes from "./auth/routes.js";
import clientRoutes from "./clients/routes.js";
import dashboardRoutes from "./dashboard/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Redis session store
const redis = env.REDIS_URL ? new Redis(env.REDIS_URL) : undefined;
const sessionStore = redis ? new RedisStore({ client: redis }) : undefined;

// Raw body for future webhook routes
app.use("/api/webhooks", express.raw({ type: "application/json" }));

// JSON body parser for all other routes
app.use(express.json());

// Session
app.use(
  session({
    store: sessionStore,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // sliding window — resets expiry on each request
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Security (Helmet, CORS, CSRF)
setupSecurity(app, env.FRONTEND_URL);

// Rate limiting
setupRateLimiting(app);

// Routes — public
app.use("/api/auth", authRoutes);

// Routes — protected
app.use("/api/clients", requireAuth, clientRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve React SPA in production
if (env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

export default app;
```

- [ ] **Step 2: Create .env.example**

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dr_ai_crm

# Redis (optional in dev, required in prod)
REDIS_URL=redis://localhost:6379

# Auth
SESSION_SECRET=change-me-to-a-64-character-random-string-for-production-use
ADMIN_EMAIL=hello@simpletechskills.com
ADMIN_PASSWORD=change-me
TOTP_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

# Frontend
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts .env.example
git commit -m "feat: wire up Express server with security middleware and new routes"
```

- [ ] **Step 4: Run ALL deferred tests**

Now that the Express app is fully wired up, run auth and client tests:

Run:
```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM"
npm run test -- --run server/tests/auth.test.ts server/tests/clients.test.ts
```

Expected: All tests pass. Fix any failures before proceeding.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire up Express server with security middleware and new routes"
```

---

## Task 7: Seed Script with Example Data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `server/package.json` (add seed script)

- [ ] **Step 1: Write seed script**

Create `prisma/seed.ts` that:
1. Creates admin User with Argon2 hashed password
2. Creates 15 example clients spanning all funnel stages and lead sources
3. Creates a ClientKnowledgeFile for each client with sample notes
4. Creates sample Activities
5. Creates a few sample Tasks

Use realistic data: names, emails, coaching packages, session counts. Make it feel like a real coaching practice.

- [ ] **Step 2: Add seed command to root package.json**

Add to the **root** `package.json` (not server/package.json — Prisma looks for the seed config relative to the prisma/ directory):
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Run seed**

Run: `npx prisma db seed`
Expected: 15 clients, 1 admin user, knowledge files, activities created.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts server/package.json
git commit -m "feat: add seed script with 15 example clients and admin user"
```

---

## Task 8: Install Client Dependencies + Tiptap

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Install Tiptap and additional UI deps**

Run:
```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM/client"
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-link @tiptap/extension-placeholder @tiptap/pm
```

- [ ] **Step 2: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "feat: add Tiptap markdown editor dependencies"
```

---

## Task 9: Frontend — Auth with TOTP + Layout

**Files:**
- Modify: `client/src/hooks/useAuth.tsx` — Add TOTP flow
- Modify: `client/src/pages/LoginPage.tsx` — Add TOTP input
- Modify: `client/src/components/layout/Sidebar.tsx` — Update nav
- Modify: `client/src/App.tsx` — Update routes
- Modify: `client/src/lib/api.ts` — Add CSRF token handling

- [ ] **Step 1: Update api.ts with CSRF token**

Modify `client/src/lib/api.ts` to fetch CSRF token on init and include it in requests:

```typescript
const BASE = "/api";

let csrfToken: string | null = null;

async function fetchCsrfToken() {
  const res = await fetch(`${BASE}/csrf-token`, { credentials: "include" });
  const data = await res.json();
  csrfToken = data.token;
}

async function request(method: string, path: string, body?: unknown) {
  if (!csrfToken && method !== "GET") {
    await fetchCsrfToken();
  }

  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (csrfToken) headers["x-csrf-token"] = csrfToken;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }

  return res.json();
}

export const api = {
  get: (path: string) => request("GET", path),
  post: (path: string, body?: unknown) => request("POST", path, body),
  patch: (path: string, body?: unknown) => request("PATCH", path, body),
  delete: (path: string) => request("DELETE", path),
};
```

- [ ] **Step 2: Update useAuth with TOTP flow**

Modify `client/src/hooks/useAuth.tsx` to handle the `requiresTotp` response — if login returns `{ requiresTotp: true }`, the hook should set a state that tells LoginPage to show the TOTP input.

- [ ] **Step 3: Update LoginPage with TOTP step**

Modify `client/src/pages/LoginPage.tsx`:
- Step 1: Email + password form
- Step 2: If `requiresTotp`, show 6-digit code input
- Submit with all three fields
- Keep dark theme (zinc-950 bg, gold accents)

- [ ] **Step 4: Update Sidebar nav items**

Modify `client/src/components/layout/Sidebar.tsx`:
- Dashboard (/)
- Inbox (/inbox) — with badge count (placeholder for Phase 3)
- Clients (/clients)
- Recordings (/recordings) — placeholder for Phase 2
- Broadcasts (/broadcasts) — placeholder for Phase 5
- Settings (/settings) — placeholder

- [ ] **Step 5: Update App.tsx routes**

```typescript
// Routes for Phase 1:
<Route path="/login" element={<LoginPage />} />
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route index element={<DashboardPage />} />
  <Route path="clients" element={<ClientsPage />} />
  <Route path="clients/:id" element={<ClientDetailPage />} />
</Route>
```

Remove old workshop routes. Add placeholder routes for future phases.

- [ ] **Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: update frontend auth with TOTP flow, sidebar nav, and route structure"
```

---

## Task 10: Frontend — Clients List Page

**Files:**
- Create: `client/src/hooks/useClients.ts`
- Create: `client/src/pages/ClientsPage.tsx`
- Create: `client/src/components/shared/DataTable.tsx`
- Create: `client/src/components/shared/SearchFilter.tsx`

- [ ] **Step 1: Create useClients hook**

React Query hooks: `useClients(params)`, `useClient(id)`, `useCreateClient()`, `useUpdateClient()`, `useDeleteClient()`, `useKnowledgeFile(clientId)`, `useUpdateKnowledgeFile()`.

- [ ] **Step 2: Create SearchFilter component**

Search input + dropdown filters for Funnel Stage, Contact Type, Source. Debounced search. Filter chips showing active filters.

- [ ] **Step 3: Create DataTable component**

Reusable table with sortable columns, row click handler, pagination controls. Uses @tanstack/react-table (already installed).

- [ ] **Step 4: Create ClientsPage**

List view with:
- SearchFilter at top
- DataTable showing: Name, Email, Stage (badge), Source, Tags, Package, Last Seen
- Click row navigates to /clients/:id
- "New Client" button opens inline form or modal
- Pagination at bottom

Dark theme: zinc-950 bg, zinc-900 table rows, gold accents for active states.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useClients.ts client/src/pages/ClientsPage.tsx client/src/components/shared/
git commit -m "feat: add clients list page with search, filters, sortable table, pagination"
```

---

## Task 11: Frontend — Client Detail Page with Tiptap Editor

**Files:**
- Create: `client/src/components/shared/MarkdownEditor.tsx`
- Create: `client/src/pages/ClientDetailPage.tsx`
- Create: `client/src/hooks/useDashboard.ts`

- [ ] **Step 1: Create MarkdownEditor component**

Tiptap editor wrapper with:
- StarterKit (headings, bold, italic, lists, code blocks)
- TaskList + TaskItem (checkboxes)
- Link extension
- Placeholder
- Toolbar: H1, H2, H3, Bold, Italic, Bullet List, Ordered List, Checkbox List, Link
- Auto-save on blur (debounced)
- Dark theme styling

- [ ] **Step 2: Create ClientDetailPage**

Tabbed layout:
1. **Contact Info** — Editable fields (firstName, lastName, email, phone, company, source, stage, tags, package, sessionsPurchased/Used)
2. **Notes** — Tiptap MarkdownEditor connected to knowledge file. Auto-saves.
3. **Activity** — Chronological list of activities (from client.activities)

Header: Name, email, stage badge, back button.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/shared/MarkdownEditor.tsx client/src/pages/ClientDetailPage.tsx
git commit -m "feat: add client detail page with Tiptap markdown editor and activity timeline"
```

---

## Task 12: Frontend — Dashboard Page

**Files:**
- Create: `client/src/hooks/useDashboard.ts`
- Rewrite: `client/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create useDashboard hook**

React Query hooks: `useDashboardStats()`, `useDashboardActivity()`.

- [ ] **Step 2: Rewrite DashboardPage**

- Stats cards row: Active Clients, Pending Tasks, Activities This Week, Funnel conversion (lead→client)
- Funnel breakdown: simple horizontal bar chart or list showing count per stage
- Recent activity feed: last 20 activities with client name, type icon, summary, timestamp
- Dark theme consistent with rest of app

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useDashboard.ts client/src/pages/DashboardPage.tsx
git commit -m "feat: rewrite dashboard with stats cards, funnel breakdown, activity feed"
```

---

## Task 13: Clean Up Old Code

**Files:**
- Delete: `server/src/contacts/` (replaced by clients)
- Delete: `server/src/workshops/` (will rebuild in later phase)
- Delete: `client/src/pages/contacts/` (replaced by ClientsPage)
- Delete: `client/src/pages/workshops/` (will rebuild later)
- Delete: `client/src/hooks/useApi.ts` (replaced by useClients, useDashboard)

- [ ] **Step 1: Remove old server code**

Delete `server/src/contacts/` and `server/src/workshops/` directories.

- [ ] **Step 2: Remove old client code**

Delete `client/src/pages/contacts/`, `client/src/pages/workshops/`, `client/src/hooks/useApi.ts`.

- [ ] **Step 3: Remove old tests**

Delete `server/tests/contacts.test.ts` and `server/tests/workshops.test.ts`.

- [ ] **Step 4: Verify build**

Run:
```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM" && npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old contacts/workshops code replaced by Phase 1 rebuild"
```

---

## Task 14: Railway Deployment

**Files:**
- Verify: `Dockerfile`
- Verify: `railway.json`

- [ ] **Step 1: Link Railway project**

Run: `cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM" && railway link`

Follow prompts to select or create the project.

- [ ] **Step 2: Provision services**

Ensure Railway project has:
- PostgreSQL plugin
- Redis plugin
- Web service from Dockerfile

- [ ] **Step 3: Set environment variables**

Set all env vars from `.env.example` on Railway:
- DATABASE_URL (from Railway Postgres plugin)
- REDIS_URL (from Railway Redis plugin)
- SESSION_SECRET (generate: `openssl rand -hex 32`)
- ADMIN_EMAIL=hello@simpletechskills.com
- ADMIN_PASSWORD (strong password)
- TOTP_ENCRYPTION_KEY (generate: `openssl rand -hex 32`)
- NODE_ENV=production
- FRONTEND_URL (Railway-provided URL or custom domain)

- [ ] **Step 4: Deploy**

Run: `railway up`

Expected: Build succeeds, migrations run, server starts.

- [ ] **Step 5: Verify deployment**

- Hit health endpoint: `curl https://<railway-url>/api/health`
- Open in browser, verify login page loads
- Log in with admin credentials
- Verify TOTP setup flow works
- Browse client list with example data

- [ ] **Step 6: Commit any deployment fixes**

```bash
git add -A
git commit -m "chore: fix deployment issues for Railway"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test -- --run`
Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 3: Manual smoke test on Railway**

Verify:
1. Login with email + password
2. TOTP setup (scan QR, enter code)
3. Login with TOTP
4. Dashboard shows stats and activity
5. Client list loads with 15 example clients
6. Search and filters work
7. Click client → detail page loads
8. Edit notes in Tiptap editor, save, refresh — notes persist
9. Create new client from list page
10. Mobile responsive (resize browser)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete - Foundation with auth, clients, dashboard, Railway deploy"
```
