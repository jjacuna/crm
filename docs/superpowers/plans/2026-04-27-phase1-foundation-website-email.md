# Phase 1: Foundation + Website + Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the CRM serving the SimpleTechSkills website with working email signup forms, Resend-powered email sequences, and Playwright E2E tests — all running locally on port 8006 for the weekend workshop.

**Architecture:** Express server serves static website HTML from `server/public/` at `/*`, React CRM SPA at `/crm/*`, and API at `/api/*`. Forms on the website POST to `/api/contacts/signup` which creates contacts and enrolls them in Resend-powered email sequences. Playwright tests validate the full flow against localhost:8006.

**Tech Stack:** Express, Prisma, PostgreSQL, Redis, Resend SDK, Playwright, React 19, Vite, Tailwind CSS v4

**Note:** This plan bundles spec Phases 1, 3, 7, and 9 (Foundation + Email + Analytics + Playwright) into a single deliverable for the workshop deadline. Future plans will cover remaining phases individually.

**Conventions:**
- Existing schema uses `@default(uuid())` and `@@map("snake_case")` — new models follow these conventions.
- Existing `EmailSequence` and `EmailLog` models are removed and replaced by the new `Sequence`/`EmailEvent` system.
- Public endpoints (`/api/contacts/signup`, `/api/analytics/track`) must include Zod validation and rate limiting.

---

## File Structure

### New Files
```
server/public/                          # Static website (extracted from zip)
server/src/config.ts                    # Modified: add RESEND_API_KEY, port 8006
server/src/index.ts                     # Modified: static site serving, new routes
server/src/emails/resend-client.ts      # Resend SDK wrapper
server/src/emails/service.ts            # Sequence processor, broadcast sender
server/src/emails/routes.ts             # Email API endpoints
server/src/emails/templates.ts          # Workshop email templates
server/src/analytics/routes.ts          # Page view tracking endpoint
server/src/analytics/service.ts         # Analytics queries
server/src/contacts/signup.ts           # Public signup endpoint (no auth)
prisma/migrations/XXXXXX_add_email_analytics/ # New migration
server/tests/emails.test.ts             # Email service tests
server/tests/signup.test.ts             # Signup flow tests
server/tests/analytics.test.ts          # Analytics service tests
client/playwright.config.ts             # Playwright configuration
client/e2e/signup-flow.spec.ts          # E2E: form signup → contact created
client/e2e/auth.spec.ts                 # E2E: login flow
client/e2e/email-sequences.spec.ts      # E2E: create/manage sequences
```

### Modified Files
```
server/src/config.ts                    # Add RESEND_API_KEY, change port default
server/src/index.ts                     # Add static serving, new route mounts, port 8006
server/src/contacts/routes.ts           # Add public signup endpoint
server/src/contacts/service.ts          # Add signup logic with sequence enrollment
server/package.json                     # Add resend dependency
client/package.json                     # Playwright already installed
client/vite.config.ts                   # Update proxy port to 8006
prisma/schema.prisma                    # Add Sequence, PageView, EmailEvent models
.env                                    # Add RESEND_API_KEY, update PORT
```

---

## Task 1: Change Server Port to 8006

**Files:**
- Modify: `server/src/config.ts:9` (PORT default)
- Modify: `client/vite.config.ts` (proxy target)
- Modify: `.env` (PORT value)

- [ ] **Step 1: Update config.ts default port**

In `server/src/config.ts`, change:
```typescript
PORT: z.coerce.number().default(8006),
```

- [ ] **Step 2: Update .env file**

In `.env`, change:
```
PORT=8006
```

- [ ] **Step 3: Update index.ts to use config.PORT**

In `server/src/index.ts`, change `const port = process.env.PORT ?? 3000;` to:
```typescript
import { config } from "./config.js";
// ...
const port = config.PORT;
```

Also add URL-encoded body parsing alongside the existing `express.json()`:
```typescript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

- [ ] **Step 4: Update Vite proxy target**

In `client/vite.config.ts`, update the proxy target from `http://localhost:3000` to `http://localhost:8006`.

- [ ] **Step 5: Verify server starts on 8006**

Run: `cd server && npm run dev`
Expected: Server listening on port 8006

Run: `curl http://localhost:8006/api/health`
Expected: 200 OK

- [ ] **Step 6: Commit**

```bash
git add server/src/config.ts server/src/index.ts client/vite.config.ts .env
git commit -m "chore: change server port to 8006, use config object, add urlencoded middleware"
```

---

## Task 2: Import Website into server/public/

**Files:**
- Create: `server/public/` (entire static site)
- Modify: `server/src/index.ts` (add static file serving)

- [ ] **Step 1: Extract website zip to server/public/**

```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM"
mkdir -p server/public
cd server/public
unzip "/Users/jonathanacuna/Documents/VS Code Programs/Websites/simpletechskills-site.zip"
# If zip extracts into a subdirectory, move contents up:
# mv simpletechskills-site/* . && rmdir simpletechskills-site
```

Verify: `ls server/public/index.html` should exist.

- [ ] **Step 2: Add static file serving to Express**

In `server/src/index.ts`, add BEFORE the SPA fallback but AFTER API routes:

```typescript
import path from "path";

// After all /api/* routes...

// Serve static website from public/
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

// Serve CRM SPA at /crm/*
const clientDir = path.join(__dirname, "../../client/dist");
app.use("/crm", express.static(clientDir));
app.get("/crm/*", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

// Fallback: try static file, then 404
app.use((_req, res) => {
  res.status(404).send("Not found");
});
```

Remove the existing production SPA fallback code that serves from `client/dist` at `/*`.

- [ ] **Step 3: Add .gitignore entry for large assets**

Add to `.gitignore`:
```
# Website images are large - only track HTML/CSS/JS
# server/public/images/  # Uncomment if images are too large for git
```

- [ ] **Step 4: Verify website serves locally**

Run: `cd server && npm run dev`

Run: `curl -s http://localhost:8006/ | head -5`
Expected: `<!DOCTYPE html>` with SimpleTechSkills content

Run: `curl -s http://localhost:8006/workshop/ | head -5`
Expected: Workshop page HTML

Run: `curl -s http://localhost:8006/api/health`
Expected: 200 OK (API still works)

- [ ] **Step 5: Commit**

```bash
git add server/public server/src/index.ts .gitignore
git commit -m "feat: serve SimpleTechSkills website from Express static files"
```

---

## Task 3: Add Prisma Models for Sequences, PageViews, EmailEvents

**Files:**
- Modify: `prisma/schema.prisma`
- Create: New migration

- [ ] **Step 1: Write failing test for new models**

Create `server/tests/schema-validation.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Schema: Sequence models", () => {
  it("creates a sequence with steps", async () => {
    const seq = await prisma.sequence.create({
      data: {
        name: "Evergreen Drip",
        steps: {
          create: [
            { order: 1, delayDays: 0, subject: "Welcome!", bodyHtml: "<p>Hi {{firstName}}</p>" },
            { order: 2, delayDays: 4, subject: "Day 4 follow-up", bodyHtml: "<p>Still here?</p>" },
          ],
        },
      },
      include: { steps: true },
    });
    expect(seq.steps).toHaveLength(2);
    expect(seq.steps[0].delayDays).toBe(0);
    expect(seq.steps[1].delayDays).toBe(4);
  });
});

describe("Schema: PageView model", () => {
  it("creates anonymous page view", async () => {
    const pv = await prisma.pageView.create({
      data: {
        url: "/workshop",
        referrer: "https://tiktok.com",
        sessionId: "anon-abc-123",
      },
    });
    expect(pv.contactId).toBeNull();
    expect(pv.sessionId).toBe("anon-abc-123");
  });
});

describe("Schema: EmailEvent model", () => {
  it("creates email event linked to contact", async () => {
    const contact = await prisma.contact.create({
      data: { firstName: "Test", lastName: "User", email: `emailevent-${Date.now()}@test.com` },
    });
    const event = await prisma.emailEvent.create({
      data: {
        contactId: contact.id,
        emailId: "resend_msg_123",
        eventType: "opened",
      },
    });
    expect(event.eventType).toBe("opened");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/schema-validation.test.ts`
Expected: FAIL - models don't exist yet

- [ ] **Step 3: Add models to Prisma schema**

Add to `prisma/schema.prisma`:

First, **remove** the existing `EmailSequence` and `EmailLog` models from `prisma/schema.prisma`. These are replaced by the new models below.

Then add:

```prisma
model Sequence {
  id          String             @id @default(uuid())
  name        String
  active      Boolean            @default(true)
  steps       SequenceStep[]
  enrollments SequenceEnrollment[]
  createdAt   DateTime           @default(now()) @map("created_at")
  updatedAt   DateTime           @updatedAt @map("updated_at")

  @@map("sequences")
}

model SequenceStep {
  id         String   @id @default(uuid())
  sequenceId String   @map("sequence_id")
  sequence   Sequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  order      Int
  delayDays  Int      @map("delay_days")
  subject    String
  bodyHtml   String   @map("body_html")
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("sequence_steps")
}

model SequenceEnrollment {
  id          String           @id @default(uuid())
  contactId   String           @map("contact_id")
  contact     Contact          @relation(fields: [contactId], references: [id], onDelete: SetNull)
  sequenceId  String           @map("sequence_id")
  sequence    Sequence         @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  currentStep Int              @default(0) @map("current_step")
  status      EnrollmentStatus @default(ACTIVE)
  enrolledAt  DateTime         @default(now()) @map("enrolled_at")
  nextSendAt  DateTime?        @map("next_send_at")

  @@unique([contactId, sequenceId])
  @@map("sequence_enrollments")
}

model EmailEvent {
  id        String   @id @default(uuid())
  contactId String   @map("contact_id")
  contact   Contact  @relation(fields: [contactId], references: [id], onDelete: SetNull)
  emailId   String?  @map("email_id")
  eventType String   @map("event_type")
  metadata  Json?
  timestamp DateTime @default(now())

  @@map("email_events")
}

model PageView {
  id        String   @id @default(uuid())
  url       String
  referrer  String?
  sessionId String   @map("session_id")
  contactId String?  @map("contact_id")
  contact   Contact? @relation(fields: [contactId], references: [id], onDelete: SetNull)
  timestamp DateTime @default(now())

  @@index([sessionId])
  @@index([contactId])
  @@index([timestamp])
  @@map("page_views")
}

model Broadcast {
  id        String          @id @default(uuid())
  name      String
  subject   String
  bodyHtml  String          @map("body_html")
  segment   Json
  status    BroadcastStatus @default(DRAFT)
  sentAt    DateTime?       @map("sent_at")
  createdAt DateTime        @default(now()) @map("created_at")

  @@map("broadcasts")
}

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  PAUSED
  CANCELED
  UNSUBSCRIBED
}

enum BroadcastStatus {
  DRAFT
  SENDING
  SENT
}
```

Also add relations and field to the existing `Contact` model:
```prisma
// Add to Contact model:
  unsubscribedAt  DateTime?          @map("unsubscribed_at")
  enrollments     SequenceEnrollment[]
  emailEvents     EmailEvent[]
  pageViews       PageView[]
```

And remove the `emailLogs` relation from Contact (since EmailLog is being removed).

- [ ] **Step 4: Generate and apply migration**

```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM"
npx prisma migrate dev --name add_email_analytics_models
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run tests/schema-validation.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add prisma/ server/tests/schema-validation.test.ts
git commit -m "feat: add Sequence, PageView, EmailEvent, Broadcast models"
```

---

## Task 4: Resend Client Setup

**Files:**
- Create: `server/src/emails/resend-client.ts`
- Modify: `server/src/config.ts` (add RESEND_API_KEY)
- Modify: `server/package.json` (add resend dep)

- [ ] **Step 1: Install resend**

```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM/server"
npm install resend
```

- [ ] **Step 2: Add RESEND_API_KEY to config**

In `server/src/config.ts`, add to the envSchema:
```typescript
RESEND_API_KEY: z.string().default("re_test_placeholder"),
RESEND_FROM_EMAIL: z.string().default("jonathan@simpletechskills.com"),
```

Add to `.env`:
```
RESEND_API_KEY=re_test_placeholder
RESEND_FROM_EMAIL=jonathan@simpletechskills.com
```

- [ ] **Step 3: Write test for renderTemplate (TDD — test first)**

Create `server/tests/emails.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { renderTemplate } from "../src/emails/resend-client.js";

describe("renderTemplate", () => {
  it("replaces {{firstName}} and {{email}}", () => {
    const html = "<p>Hi {{firstName}}, your email is {{email}}</p>";
    const result = renderTemplate(html, { firstName: "Jon", email: "jon@test.com" });
    expect(result).toBe("<p>Hi Jon, your email is jon@test.com</p>");
  });

  it("leaves unknown vars as empty string", () => {
    const html = "<p>{{unknown}}</p>";
    const result = renderTemplate(html, {});
    expect(result).toBe("<p></p>");
  });
});
```

- [ ] **Step 4: Run test to verify failure**

Run: `cd server && npx vitest run tests/emails.test.ts`
Expected: FAIL — module not found

- [ ] **Step 5: Create Resend client wrapper**

Create `server/src/emails/resend-client.ts`:
```typescript
import { Resend } from "resend";
import { config } from "../config.js";

export const resend = new Resend(config.RESEND_API_KEY);

export function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && npx vitest run tests/emails.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/emails/ server/tests/emails.test.ts server/src/config.ts server/package.json server/package-lock.json .env
git commit -m "feat: add Resend client and template renderer"
```

---

## Task 5: Email Service (Sequences + Broadcasts)

**Files:**
- Create: `server/src/emails/service.ts`
- Create: `server/src/emails/routes.ts`
- Modify: `server/src/index.ts` (mount routes)
- Modify: `server/tests/emails.test.ts` (add service tests)

- [ ] **Step 1: Write failing tests for email service**

Add to `server/tests/emails.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("EmailService", () => {
  beforeEach(async () => {
    await prisma.sequenceEnrollment.deleteMany();
    await prisma.sequenceStep.deleteMany();
    await prisma.sequence.deleteMany();
  });

  it("creates a sequence with steps", async () => {
    const { createSequence } = await import("../src/emails/service.js");
    const seq = await createSequence({
      name: "Workshop Prep",
      steps: [
        { order: 1, delayDays: 0, subject: "Welcome!", bodyHtml: "<p>Hi!</p>" },
        { order: 2, delayDays: 2, subject: "Get ready", bodyHtml: "<p>Tomorrow!</p>" },
      ],
    });
    expect(seq.name).toBe("Workshop Prep");
    expect(seq.steps).toHaveLength(2);
  });

  it("enrolls a contact in a sequence", async () => {
    const { createSequence, enrollContact } = await import("../src/emails/service.js");
    const contact = await prisma.contact.create({
      data: { firstName: "Test", lastName: "User", email: `enroll-${Date.now()}@test.com` },
    });
    const seq = await createSequence({
      name: "Test Seq",
      steps: [{ order: 1, delayDays: 0, subject: "Hi", bodyHtml: "<p>Hi</p>" }],
    });
    const enrollment = await enrollContact(contact.id, seq.id);
    expect(enrollment.status).toBe("ACTIVE");
    expect(enrollment.currentStep).toBe(0);
  });

  it("prevents double enrollment", async () => {
    const { createSequence, enrollContact } = await import("../src/emails/service.js");
    const contact = await prisma.contact.create({
      data: { firstName: "Test", lastName: "Dupe", email: `dupe-${Date.now()}@test.com` },
    });
    const seq = await createSequence({
      name: "Dupe Test",
      steps: [{ order: 1, delayDays: 0, subject: "Hi", bodyHtml: "<p>Hi</p>" }],
    });
    await enrollContact(contact.id, seq.id);
    await expect(enrollContact(contact.id, seq.id)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/emails.test.ts`
Expected: FAIL - service.ts doesn't exist

- [ ] **Step 3: Implement email service**

Create `server/src/emails/service.ts`:
```typescript
import { prisma } from "../lib/prisma.js";
import { resend, renderTemplate } from "./resend-client.js";
import { config } from "../config.js";

interface CreateSequenceInput {
  name: string;
  steps: { order: number; delayDays: number; subject: string; bodyHtml: string }[];
}

export async function createSequence(input: CreateSequenceInput) {
  return prisma.sequence.create({
    data: {
      name: input.name,
      steps: { create: input.steps },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
}

export async function listSequences() {
  return prisma.sequence.findMany({
    include: { steps: { orderBy: { order: "asc" } }, _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function enrollContact(contactId: string, sequenceId: string) {
  const firstStep = await prisma.sequenceStep.findFirst({
    where: { sequenceId, order: 1 },
  });
  const nextSendAt = firstStep?.delayDays === 0
    ? new Date()
    : new Date(Date.now() + (firstStep?.delayDays ?? 0) * 86400000);

  return prisma.sequenceEnrollment.create({
    data: { contactId, sequenceId, nextSendAt },
  });
}

export async function processSequenceEmails() {
  const due = await prisma.sequenceEnrollment.findMany({
    where: {
      status: "ACTIVE",
      nextSendAt: { lte: new Date() },
    },
    include: {
      contact: true,
      sequence: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });

  for (const enrollment of due) {
    const step = enrollment.sequence.steps[enrollment.currentStep];
    if (!step) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED" },
      });
      continue;
    }

    if (enrollment.contact.unsubscribedAt) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "UNSUBSCRIBED" },
      });
      continue;
    }

    const html = renderTemplate(step.bodyHtml, {
      firstName: enrollment.contact.firstName,
      lastName: enrollment.contact.lastName,
      email: enrollment.contact.email,
    });

    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: enrollment.contact.email,
      subject: renderTemplate(step.subject, { firstName: enrollment.contact.firstName }),
      html,
    });

    await prisma.emailEvent.create({
      data: {
        contactId: enrollment.contact.id,
        emailId: result.data?.id ?? null,
        eventType: "sent",
      },
    });

    const nextStep = enrollment.sequence.steps[enrollment.currentStep + 1];
    if (nextStep) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: enrollment.currentStep + 1,
          nextSendAt: new Date(Date.now() + nextStep.delayDays * 86400000),
        },
      });
    } else {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED" },
      });
    }
  }
}

export async function sendBroadcast(broadcastId: string) {
  const broadcast = await prisma.broadcast.findUniqueOrThrow({ where: { id: broadcastId } });

  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { status: "SENDING" },
  });

  const contacts = await prisma.contact.findMany({
    where: {
      status: "active",
      unsubscribedAt: null,
    },
  });

  for (const contact of contacts) {
    const html = renderTemplate(broadcast.bodyHtml, {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
    });

    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: contact.email,
      subject: renderTemplate(broadcast.subject, { firstName: contact.firstName }),
      html,
    });

    await prisma.emailEvent.create({
      data: {
        contactId: contact.id,
        emailId: result.data?.id ?? null,
        eventType: "sent",
      },
    });
  }

  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { status: "SENT", sentAt: new Date() },
  });
}
```

- [ ] **Step 4: Create email routes**

Create `server/src/emails/routes.ts`:
```typescript
import { Router } from "express";
import * as emailService from "./service.js";
import { prisma } from "../lib/prisma.js";

export const emailRoutes = Router();

// List sequences
emailRoutes.get("/sequences", async (_req, res, next) => {
  try {
    const sequences = await emailService.listSequences();
    res.json(sequences);
  } catch (err) { next(err); }
});

// Create sequence
emailRoutes.post("/sequences", async (req, res, next) => {
  try {
    const sequence = await emailService.createSequence(req.body);
    res.status(201).json(sequence);
  } catch (err) { next(err); }
});

// Enroll contact in sequence
emailRoutes.post("/sequences/:id/enroll", async (req, res, next) => {
  try {
    const enrollment = await emailService.enrollContact(req.body.contactId, req.params.id);
    res.status(201).json(enrollment);
  } catch (err) { next(err); }
});

// List broadcasts
emailRoutes.get("/broadcasts", async (_req, res, next) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({ orderBy: { createdAt: "desc" } });
    res.json(broadcasts);
  } catch (err) { next(err); }
});

// Create broadcast
emailRoutes.post("/broadcasts", async (req, res, next) => {
  try {
    const broadcast = await prisma.broadcast.create({ data: req.body });
    res.status(201).json(broadcast);
  } catch (err) { next(err); }
});

// Send broadcast
emailRoutes.post("/broadcasts/:id/send", async (req, res, next) => {
  try {
    await emailService.sendBroadcast(req.params.id);
    res.json({ status: "sent" });
  } catch (err) { next(err); }
});

// Resend webhook handler
emailRoutes.post("/webhooks/resend", async (req, res, next) => {
  try {
    const { type, data } = req.body;
    const eventMap: Record<string, string> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };
    const eventType = eventMap[type];
    if (!eventType) { res.json({ ok: true }); return; }

    // Find contact by email from webhook payload
    const contact = await prisma.contact.findUnique({ where: { email: data.to?.[0] } });
    if (contact) {
      await prisma.emailEvent.create({
        data: {
          contactId: contact.id,
          emailId: data.email_id,
          eventType,
          metadata: data,
        },
      });

      // Handle unsubscribe
      if (type === "email.complained") {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { unsubscribedAt: new Date() },
        });
      }
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Mount email routes in index.ts**

In `server/src/index.ts`, add:
```typescript
import { emailRoutes, resendWebhookHandler } from "./emails/routes.js";

// After existing route mounts, before static serving:
app.use("/api/emails", requireAuth, emailRoutes);
app.post("/api/webhooks/resend", resendWebhookHandler); // Webhook is public (no auth)
```

In `server/src/emails/routes.ts`, export the webhook handler as a standalone function:
```typescript
export const resendWebhookHandler: RequestHandler = async (req, res, next) => { ... };
```
(Extract the webhook logic from the router into this exported handler.)

- [ ] **Step 6: Run tests**

Run: `cd server && npx vitest run tests/emails.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/emails/ server/tests/emails.test.ts server/src/index.ts
git commit -m "feat: add email service with sequences, broadcasts, and Resend integration"
```

---

## Task 6: Public Signup Endpoint (Replace Kit Forms)

**Files:**
- Create: `server/src/contacts/signup.ts`
- Modify: `server/src/index.ts` (mount public route)
- Create: `server/tests/signup.test.ts`

- [ ] **Step 1: Write failing test**

Create `server/tests/signup.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Signup service", () => {
  beforeEach(async () => {
    await prisma.sequenceEnrollment.deleteMany();
    await prisma.contact.deleteMany({ where: { email: { contains: "signup-test" } } });
  });

  it("creates contact from signup", async () => {
    const { processSignup } = await import("../src/contacts/signup.js");
    const result = await processSignup({
      email: `signup-test-${Date.now()}@test.com`,
      firstName: "Test",
      sourcePage: "/workshop",
    });
    expect(result.contact.funnelStage).toBe("lead");
    expect(result.contact.leadSource).toBe("/workshop");
  });

  it("returns existing contact if email exists", async () => {
    const { processSignup } = await import("../src/contacts/signup.js");
    const email = `signup-test-existing-${Date.now()}@test.com`;
    const r1 = await processSignup({ email, firstName: "First" });
    const r2 = await processSignup({ email, firstName: "Second" });
    expect(r1.contact.id).toBe(r2.contact.id);
    expect(r2.isNew).toBe(false);
  });

  it("links anonymous session to contact", async () => {
    const { processSignup } = await import("../src/contacts/signup.js");
    const email = `signup-test-session-${Date.now()}@test.com`;

    // Create anonymous page views
    await prisma.pageView.createMany({
      data: [
        { url: "/", sessionId: "anon-session-1", referrer: "https://tiktok.com" },
        { url: "/workshop", sessionId: "anon-session-1" },
      ],
    });

    const result = await processSignup({ email, firstName: "Session", sessionId: "anon-session-1" });

    const views = await prisma.pageView.findMany({
      where: { sessionId: "anon-session-1" },
    });
    expect(views.every(v => v.contactId === result.contact.id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd server && npx vitest run tests/signup.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement signup service**

Create `server/src/contacts/signup.ts`:
```typescript
import { prisma } from "../lib/prisma.js";

interface SignupInput {
  email: string;
  firstName?: string;
  lastName?: string;
  sourcePage?: string;
  sessionId?: string;
  sequenceId?: string;
}

export async function processSignup(input: SignupInput) {
  let isNew = false;
  let contact = await prisma.contact.findUnique({ where: { email: input.email } });

  if (!contact) {
    isNew = true;
    contact = await prisma.contact.create({
      data: {
        email: input.email,
        firstName: input.firstName ?? "",
        lastName: input.lastName ?? "",
        leadSource: input.sourcePage ?? "direct",
        contactType: "lead",
        funnelStage: "lead",
      },
    });
  }

  // Link anonymous page views to this contact
  if (input.sessionId) {
    await prisma.pageView.updateMany({
      where: { sessionId: input.sessionId, contactId: null },
      data: { contactId: contact.id },
    });
  }

  // Auto-enroll in sequence if specified
  if (input.sequenceId && isNew) {
    try {
      const { enrollContact } = await import("../emails/service.js");
      await enrollContact(contact.id, input.sequenceId);
    } catch {
      // Ignore if already enrolled
    }
  }

  return { contact, isNew };
}
```

- [ ] **Step 4: Add signup route to index.ts**

In `server/src/index.ts`, add a public (no auth) endpoint:
```typescript
import { processSignup } from "./contacts/signup.js";

// Public signup endpoint (no auth required - website forms POST here)
app.post("/api/contacts/signup", async (req, res, next) => {
  try {
    const { contact, isNew } = await processSignup(req.body);
    // If the request wants JSON, return JSON
    if (req.headers.accept?.includes("application/json")) {
      res.status(isNew ? 201 : 200).json({ contact, isNew });
      return;
    }
    // Otherwise redirect to success page (form submission)
    const redirect = req.body.redirect || "/success-638d74h";
    res.redirect(303, redirect);
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Run tests**

Run: `cd server && npx vitest run tests/signup.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/contacts/signup.ts server/tests/signup.test.ts server/src/index.ts
git commit -m "feat: add public signup endpoint for website form capture"
```

---

## Task 7: Update Website Forms to POST to CRM

**Files:**
- Modify: `server/public/index.html` (main form)
- Modify: Other pages with Kit forms

- [ ] **Step 1: Replace Kit form on homepage**

In `server/public/index.html`, find the Kit form script tag:
```html
<script async data-uid="c70c90cd24" src="https://simple-tech-skills.kit.com/c70c90cd24/index.js"></script>
```

Replace the entire Kit form container with a native HTML form:
```html
<form action="/api/contacts/signup" method="POST" class="crm-signup-form" id="signup-form">
  <input type="hidden" name="sourcePage" value="/">
  <input type="hidden" name="redirect" value="/success-638d74h">
  <input type="hidden" name="sessionId" value="" id="signup-session-id">
  <input type="text" name="firstName" placeholder="First Name" required
    style="width:100%;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:10px;color:#fff;font-family:'Inter',sans-serif;font-size:15px;padding:14px 16px;margin-bottom:12px;">
  <input type="email" name="email" placeholder="Email Address" required
    style="width:100%;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:10px;color:#fff;font-family:'Inter',sans-serif;font-size:15px;padding:14px 16px;margin-bottom:12px;">
  <button type="submit"
    style="width:100%;background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);color:#000;font-weight:800;padding:16px;border-radius:10px;border:none;text-transform:uppercase;font-size:15px;cursor:pointer;">
    Send Me the Free Training
  </button>
</form>
<script>
// Set session ID for anonymous tracking
document.getElementById('signup-session-id').value =
  document.cookie.match(/crm_session=([^;]+)/)?.[1] || '';
// Fire tracking on form submit
document.getElementById('signup-form').addEventListener('submit', function() {
  if (typeof fbq === 'function') fbq('track', 'Lead');
  if (typeof ttq !== 'undefined') ttq.track('SubmitForm');
});
</script>
```

- [ ] **Step 2: Repeat for other pages**

Apply the same pattern to:
- `/claude/index.html` (sourcePage="/claude")
- `/certification/index.html` (sourcePage="/certification")
- `/claude-instagram/index.html` (sourcePage="/claude-instagram")
- `/claude-tiktok/index.html` (sourcePage="/claude-tiktok")
- `/company-of-one/index.html` (sourcePage="/company-of-one")

Each page gets its own `sourcePage` value so funnel analytics can track which page drove the signup.

- [ ] **Step 3: Remove Kit script references**

Remove all Kit-related JavaScript:
- Remove Kit form script tags (`src="https://simple-tech-skills.kit.com/..."`)
- Remove Kit MutationObserver JavaScript
- Remove Kit button text override JavaScript
- Keep GA4, TikTok Pixel, and Facebook Pixel scripts (they still fire via the form submit listener)

- [ ] **Step 4: Verify form submits locally**

Run: `cd server && npm run dev`

Test with curl:
```bash
curl -X POST http://localhost:8006/api/contacts/signup \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@example.com&firstName=Test&sourcePage=/workshop" \
  -v
```
Expected: 303 redirect to `/success-638d74h`

- [ ] **Step 5: Commit**

```bash
git add server/public/
git commit -m "feat: replace Kit forms with CRM signup forms on all pages"
```

---

## Task 8: Page View Tracking

**Files:**
- Create: `server/src/analytics/routes.ts`
- Create: `server/src/analytics/service.ts`
- Modify: `server/src/index.ts` (mount routes)
- Modify: `server/public/index.html` (add tracking snippet)

- [ ] **Step 1: Write failing test**

Create `server/tests/analytics.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Analytics service", () => {
  it("records a page view", async () => {
    const { trackPageView } = await import("../src/analytics/service.js");
    const pv = await trackPageView({
      url: "/workshop",
      referrer: "https://tiktok.com",
      sessionId: "test-session-123",
    });
    expect(pv.url).toBe("/workshop");
    expect(pv.sessionId).toBe("test-session-123");
  });

  it("returns funnel metrics", async () => {
    const { getFunnelMetrics } = await import("../src/analytics/service.js");
    const metrics = await getFunnelMetrics();
    expect(metrics).toHaveProperty("totalPageViews");
    expect(metrics).toHaveProperty("totalSignups");
    expect(metrics).toHaveProperty("pageBreakdown");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd server && npx vitest run tests/analytics.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement analytics service**

Create `server/src/analytics/service.ts`:
```typescript
import { prisma } from "../lib/prisma.js";

interface TrackInput {
  url: string;
  referrer?: string;
  sessionId: string;
  contactId?: string;
}

export async function trackPageView(input: TrackInput) {
  return prisma.pageView.create({ data: input });
}

export async function getFunnelMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86400000);

  const [totalPageViews, uniqueVisitors, totalSignups, pageBreakdown] = await Promise.all([
    prisma.pageView.count({ where: { timestamp: { gte: since } } }),
    prisma.pageView.groupBy({
      by: ["sessionId"],
      where: { timestamp: { gte: since } },
    }).then(r => r.length),
    prisma.contact.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.groupBy({
      by: ["url"],
      where: { timestamp: { gte: since } },
      _count: true,
      orderBy: { _count: { url: "desc" } },
    }),
  ]);

  return {
    totalPageViews,
    uniqueVisitors,
    totalSignups,
    conversionRate: uniqueVisitors > 0 ? (totalSignups / uniqueVisitors * 100).toFixed(1) : "0",
    pageBreakdown: pageBreakdown.map(p => ({ url: p.url, views: p._count })),
  };
}
```

- [ ] **Step 4: Create analytics routes**

Create `server/src/analytics/routes.ts`:
```typescript
import { Router } from "express";
import { trackPageView, getFunnelMetrics } from "./service.js";

export const analyticsRoutes = Router();

// Public: track page view (called from website JS snippet)
analyticsRoutes.post("/track", async (req, res, next) => {
  try {
    await trackPageView(req.body);
    res.status(204).end();
  } catch (err) { next(err); }
});

// Protected: get funnel metrics (CRM dashboard)
analyticsRoutes.get("/funnel", async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const metrics = await getFunnelMetrics(days);
    res.json(metrics);
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Mount analytics routes in index.ts**

In `server/src/analytics/routes.ts`, split into two routers:
```typescript
import { Router } from "express";
import { trackPageView, getFunnelMetrics } from "./service.js";

// Public routes (no auth) — for website tracking
export const analyticsPublicRoutes = Router();
analyticsPublicRoutes.post("/track", async (req, res, next) => {
  try { await trackPageView(req.body); res.status(204).end(); } catch (err) { next(err); }
});

// Protected routes (require auth) — for CRM dashboard
export const analyticsProtectedRoutes = Router();
analyticsProtectedRoutes.get("/funnel", async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    res.json(await getFunnelMetrics(days));
  } catch (err) { next(err); }
});
```

In `server/src/index.ts`:
```typescript
import { analyticsPublicRoutes, analyticsProtectedRoutes } from "./analytics/routes.js";

app.use("/api/analytics", analyticsPublicRoutes);          // /api/analytics/track (public)
app.use("/api/analytics", requireAuth, analyticsProtectedRoutes); // /api/analytics/funnel (protected)
```

- [ ] **Step 6: Add tracking snippet to website pages**

Add this script before `</body>` in all website HTML pages:
```html
<script>
(function() {
  // Generate or retrieve session ID
  var sid = document.cookie.match(/crm_session=([^;]+)/);
  if (!sid) {
    var id = Math.random().toString(36).substr(2) + Date.now().toString(36);
    document.cookie = 'crm_session=' + id + ';path=/;max-age=86400';
    sid = [null, id];
  }
  // Track page view
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: location.pathname,
      referrer: document.referrer || null,
      sessionId: sid[1]
    })
  }).catch(function() {});
})();
</script>
```

- [ ] **Step 7: Run tests**

Run: `cd server && npx vitest run tests/analytics.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add server/src/analytics/ server/tests/analytics.test.ts server/src/index.ts server/public/
git commit -m "feat: add page view tracking and funnel analytics"
```

---

## Task 9: Workshop Email Templates

**Files:**
- Create: `server/src/emails/templates.ts`

- [ ] **Step 1: Create workshop email templates**

Create `server/src/emails/templates.ts`:
```typescript
export const workshopTemplates = {
  preWorkshopDay3: {
    subject: "Your Claude Workshop is in 3 days, {{firstName}}!",
    bodyHtml: `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <h2 style="color:#FFD700;">Your Workshop is Almost Here!</h2>
  <p>Hey {{firstName}},</p>
  <p>Just a quick reminder — your Claude AI Workshop is happening in <strong>3 days</strong>.</p>
  <p>Here's what to have ready:</p>
  <ul>
    <li>A laptop with Chrome or Firefox</li>
    <li>A free Claude account (claude.ai)</li>
    <li>Your biggest business question for AI</li>
  </ul>
  <p>See you Saturday at 3 PM ET!</p>
  <p>— Jonathan (Doctor AI)</p>
</div>`,
  },
  preWorkshopDay1: {
    subject: "Tomorrow! Your Claude Workshop with Doctor AI",
    bodyHtml: `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <h2 style="color:#FFD700;">Tomorrow's the Day!</h2>
  <p>Hey {{firstName}},</p>
  <p>Your Claude AI Workshop is <strong>tomorrow at 3 PM ET</strong>.</p>
  <p>Check your email for the Zoom link. If you don't see it, reply to this email and I'll send it right over.</p>
  <p>Can't wait to build with you!</p>
  <p>— Jonathan (Doctor AI)</p>
</div>`,
  },
  postWorkshopDay1: {
    subject: "How was the workshop, {{firstName}}?",
    bodyHtml: `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <h2 style="color:#FFD700;">Thanks for Showing Up!</h2>
  <p>Hey {{firstName}},</p>
  <p>Thanks for attending yesterday's Claude AI Workshop. You showed up, and that's what matters.</p>
  <p>Here's what to do next:</p>
  <ol>
    <li>Try building one thing with Claude today</li>
    <li>Join our community if you haven't: <a href="https://ai-community-215177.circle.so">Circle Community</a></li>
    <li>Reply to this email with any questions</li>
  </ol>
  <p>— Jonathan (Doctor AI)</p>
</div>`,
  },
  evergreenDrip1: {
    subject: "Welcome to Doctor AI Academy, {{firstName}}!",
    bodyHtml: `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <h2 style="color:#FFD700;">Welcome!</h2>
  <p>Hey {{firstName}},</p>
  <p>Thanks for grabbing the free Claude AI guides. You just made a great decision.</p>
  <p>Over the next few emails, I'm going to show you how non-technical people are using Claude to build real apps, automate their business, and save hours every week.</p>
  <p>But first — go download your guides if you haven't yet:</p>
  <p><a href="https://simpletechskills.com/success-638d74h" style="color:#FFD700;">Access Your Free Training</a></p>
  <p>Talk soon,</p>
  <p>— Jonathan (Doctor AI)</p>
</div>`,
  },
  evergreenDrip2: {
    subject: "The #1 mistake people make with AI, {{firstName}}",
    bodyHtml: `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <h2 style="color:#FFD700;">Don't Make This Mistake</h2>
  <p>Hey {{firstName}},</p>
  <p>The biggest mistake I see? People use AI to <em>chat</em> instead of to <strong>build</strong>.</p>
  <p>Claude isn't a chatbot. It's a builder. You can use it to create apps, automate workflows, write content systems — all without writing code yourself.</p>
  <p>That's exactly what I teach in my free Saturday workshop.</p>
  <p><a href="https://simpletechskills.com/workshop" style="color:#FFD700;">Check the Next Workshop Date</a></p>
  <p>— Jonathan (Doctor AI)</p>
</div>`,
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/emails/templates.ts
git commit -m "feat: add workshop and evergreen email templates"
```

---

## Task 10: Playwright Configuration and E2E Tests

**Files:**
- Create: `client/playwright.config.ts`
- Create: `client/e2e/signup-flow.spec.ts`
- Create: `client/e2e/auth.spec.ts`

- [ ] **Step 1: Create Playwright config**

Create `client/playwright.config.ts`:
```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:8006",
    headless: true,
  },
  webServer: {
    command: "cd ../server && npm run dev",
    port: 8006,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
```

- [ ] **Step 2: Install Playwright browsers**

```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM/client"
npx playwright install chromium
```

- [ ] **Step 3: Create auth E2E test**

Create `client/e2e/auth.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page at /crm/login", async ({ page }) => {
    await page.goto("/crm/login");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
  });

  test("logs in with valid credentials", async ({ page }) => {
    await page.goto("/crm/login");
    await page.fill("input[type='email'], input[name='email']", "admin");
    await page.fill("input[type='password']", "admin");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/crm\/?$/);
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/crm/login");
    await page.fill("input[type='email'], input[name='email']", "admin");
    await page.fill("input[type='password']", "wrongpassword");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Invalid")).toBeVisible();
  });
});
```

- [ ] **Step 4: Create signup flow E2E test**

Create `client/e2e/signup-flow.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test.describe("Website Signup Flow", () => {
  test("homepage loads with signup form", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("title")).toContainText(["Claude", "Doctor AI"]);
    await expect(page.locator("#signup-form")).toBeVisible();
  });

  test("form submits and redirects to success page", async ({ page }) => {
    await page.goto("/");
    const email = `playwright-${Date.now()}@test.com`;
    await page.fill("#signup-form input[name='firstName']", "Playwright");
    await page.fill("#signup-form input[name='email']", email);
    await page.click("#signup-form button[type='submit']");
    await expect(page).toHaveURL(/success-638d74h/);
  });

  test("success page loads with gift progress tracker", async ({ page }) => {
    await page.goto("/success-638d74h");
    await expect(page.locator("body")).toContainText(["gift", "progress", "completed"]);
  });

  test("workshop page loads", async ({ page }) => {
    await page.goto("/workshop/");
    await expect(page.locator("body")).toContainText("Workshop");
  });

  test("API health check responds", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run E2E tests**

Ensure server is running, then:
```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM/client"
npx playwright test
```
Expected: All tests pass

- [ ] **Step 6: Update root package.json test:e2e script**

Verify `package.json` at root has:
```json
"test:e2e": "cd client && npx playwright test"
```

- [ ] **Step 7: Commit**

```bash
git add client/playwright.config.ts client/e2e/ client/package.json
git commit -m "feat: add Playwright E2E tests for auth and signup flow"
```

---

## Task 11: Update CRM Client Routing for /crm/ Base Path

**Files:**
- Modify: `client/src/App.tsx` (add basename)
- Modify: `client/vite.config.ts` (add base path)

- [ ] **Step 1: Update React Router basename**

In `client/src/App.tsx`, update the router to use `/crm` as the base:
```typescript
// If using createBrowserRouter:
const router = createBrowserRouter(routes, { basename: "/crm" });

// If using <BrowserRouter>:
<BrowserRouter basename="/crm">
```

- [ ] **Step 2: Update Vite base path for production builds**

In `client/vite.config.ts`, add:
```typescript
export default defineConfig({
  base: "/crm/",
  // ... rest of config
});
```

- [ ] **Step 3: Audit and fix hardcoded paths in client code**

Grep for hardcoded absolute paths that would break with the `/crm` basename:
```bash
grep -rn '"/login\|"/contacts\|"/workshops\|href="/' client/src/
```

Update any `window.location.href = "/login"` or `<a href="/login">` to use React Router's `useNavigate()` or relative paths. React Router's `<Navigate to="/login">` is fine — it respects basename.

- [ ] **Step 4: Verify CRM loads at /crm/**

Run both server and client dev:
```bash
cd "/Users/jonathanacuna/Documents/VS Code Programs/CRM" && npm run dev
```

Open `http://localhost:8006/crm/` — should show the CRM login.
Open `http://localhost:8006/` — should show the SimpleTechSkills website.

**Dev workflow note:** During development, `localhost:5173/crm/` gives hot-reloading CRM development. `localhost:8006/` gives the full experience (website + API). Use port 8006 for integration testing.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/vite.config.ts
git commit -m "feat: move CRM UI to /crm/ base path"
```

---

## Summary: What This Phase Delivers

After all 11 tasks:

1. **Server runs on port 8006** locally
2. **SimpleTechSkills website** served at `localhost:8006/`
3. **CRM dashboard** at `localhost:8006/crm/`
4. **Signup forms** on website POST to CRM, creating contacts with source tracking
5. **Anonymous session linking** — page views connected to contacts at signup
6. **Email sequences** via Resend (evergreen drip, workshop prep/follow-up)
7. **Broadcasts** for one-off sends to your list
8. **Resend webhooks** for open/click/bounce/unsubscribe tracking
9. **Funnel analytics** — page views, signups, conversion rates
10. **Workshop email templates** ready to send
11. **Playwright E2E tests** validating auth and signup flows
12. **GitHub backup** at `https://github.com/jjacuna/crm.git`
