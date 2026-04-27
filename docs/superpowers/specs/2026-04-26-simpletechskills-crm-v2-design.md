# SimpleTechSkills CRM v2 - Design Specification

**Project:** SimpleTechSkills CRM v2 (Dr. AI CRM + Website)
**Owner:** Jonathan Acuna, Simple Tech Skills Corp
**Date:** 2026-04-26
**Status:** Approved
**Supersedes:** 2026-04-25-dr-ai-crm-design.md (extends with website, email, funnel)

### Relationship to v1 Spec

This spec **supersedes** the v1 design spec (2026-04-25). Key changes:

- **Naming:** The core entity is `Contact` (v1 used `Client`). All references updated.
- **Email sequences:** The v2 `Sequence`/`SequenceStep`/`SequenceEnrollment` models replace v1's `EmailSequence`/`EmailSequenceEnrollment`. Steps are now relational (not JSON). Auto-enrollment via `triggerTag` is replaced by explicit enrollment at signup via the form capture endpoint.
- **Email sending:** All sequence and broadcast emails send via **Resend**. Personal 1:1 replies send via **Gmail API**. V1 routed sequences through Gmail; that is no longer the case.
- **Port:** Local dev server runs on port **8006** (changed from v1's 3000 to avoid conflicts with other local services).
- **Sessions:** `sameSite=lax` (changed from v1's `strict`) because the static website and CRM share one origin, and form POSTs from the static site to the API require `lax`.
- **Fathom integration:** Deferred to a future phase. Not included in this spec's phase breakdown.
- **All v1 models not explicitly superseded here remain in the schema unchanged:** User, Activity, Recording (deferred), Task, Payment (renamed fields below), Email (Gmail model), etc.

---

## 1. Purpose

A single-deploy system combining the SimpleTechSkills marketing website and a full CRM on Railway. Replaces Kit (ConvertKit), eliminates manual Gmail sends, and consolidates client management, email sequences, funnel analytics, and payment tracking into one codebase.

The user is a solopreneur running Doctor AI Academy. This system lets him:

- Serve all SimpleTechSkills website pages from one deploy
- Capture form signups directly into the CRM contact list
- Send email sequences (evergreen 4-day drip) and broadcasts via Resend
- Read Gmail inbox and have AI draft replies overnight
- Respond to Circle community DMs from a unified Messages inbox
- Track payments across two Stripe accounts
- Sync tasks bidirectionally with TickTick
- See funnel analytics (page views to signups to purchases)
- Test everything locally with Playwright on port 8006

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 19 + TypeScript + Vite | Mobile-responsive SPA for CRM UI |
| UI Components | Shadcn UI + Radix UI | Accessible, customizable, dark mode |
| Styling | Tailwind CSS v4 | Responsive, utility-first |
| Data Fetching | React Query (TanStack Query) | Caching, background refetch |
| Routing | React Router v7 | Nested layouts |
| Forms | React Hook Form | Performant |
| Markdown Editor | Tiptap | Rich markdown for knowledge files |
| Backend | Express + TypeScript | Full control, no vendor lock-in |
| ORM | Prisma | Typed schema, migrations |
| Database | PostgreSQL (Railway) | Relational, JSONB for flexible fields |
| Sessions | Redis (Railway) | Secure session store |
| Auth | Argon2 + TOTP 2FA | Ironclad security for public-facing app |
| Email Sending | Resend | Handles 5,000+ subscriber list, deliverability, open/click tracking |
| Email Reading | Gmail API (googleapis) | OAuth2 for inbox reading + draft sending |
| Payments | Stripe (x2 accounts) | Webhook-driven payment capture |
| Tasks | TickTick API | OAuth2 bidirectional sync |
| Community | Circle API | DM reading/sending, member list |
| Cron | Railway cron service / node-cron locally | Email agent, sequence processing |
| Testing | Playwright | E2E tests against localhost:8006 |
| Deploy | Railway (Dockerfile) | Server + Postgres + Redis in one platform |

---

## 3. Architecture

```
                    Railway (Single Deploy)
    +--------------------------------------------------+
    |                                                  |
    |   Express Server (port 8006 locally)             |
    |                                                  |
    |   Routes:                                        |
    |   ├── /api/auth/*         Auth (login, 2FA)      |
    |   ├── /api/contacts/*     CRM contacts CRUD      |
    |   ├── /api/messages/*     Unified inbox           |
    |   ├── /api/emails/*       Sequences, broadcasts   |
    |   ├── /api/payments/*     Stripe data             |
    |   ├── /api/tasks/*        TickTick sync           |
    |   ├── /api/analytics/*    Funnel data             |
    |   ├── /api/webhooks/stripe   Stripe webhooks      |
    |   ├── /api/webhooks/resend   Email event hooks    |
    |   ├── /crm/*              React SPA (CRM UI)      |
    |   └── /*                  Static website (HTML)   |
    |                                                  |
    |   Background Jobs:                               |
    |   ├── Email agent (overnight Gmail triage)        |
    |   ├── Sequence processor (check & send due emails)|
    |   └── TickTick sync (periodic pull)               |
    |                                                  |
    +--------+------------------+----------------------+
             |                  |
        PostgreSQL           Redis
        (all data)        (sessions)
```

### Routing Priority

1. `/api/*` — API endpoints (JSON)
2. `/crm/*` — Serves the React SPA (CRM dashboard)
3. `/*` — Serves static HTML files from `server/public/` (the marketing website)

This means `simpletechskills.com/` shows the website, `simpletechskills.com/crm/` shows the CRM dashboard.

---

## 4. Left Navigation (CRM UI)

| # | Section | Description |
|---|---------|-------------|
| 1 | **Dashboard** | Funnel metrics (visitors, signups, purchases), revenue chart, upcoming tasks, recent activity |
| 2 | **CRM** | Contacts list with search/filter, client detail pages with markdown knowledge files, session history, tags, notes |
| 3 | **Messages** | Unified inbox: Gmail + Circle DMs. AI-drafted replies flagged for review. Send directly from CRM. |
| 4 | **Payments** | Stripe transactions from both accounts linked to contacts. Payment history, revenue by product. |
| 5 | **Tasks** | Two-way TickTick sync. Create/edit tasks, see TickTick tasks. Push and pull. |
| 6 | **Settings** | Account settings, integration configs (Gmail OAuth, Stripe keys, TickTick, Circle, Resend API key), email templates, sequence builder |

---

## 5. Email System

### 5.1 Outbound (Resend)

All sequence and broadcast emails are sent via Resend. Personal 1:1 replies continue to use Gmail API.

- **Sequences:** Template chains with configurable delays. E.g., "Evergreen Drip" — email 1 on signup, email 2 at day 4, email 3 at day 8. Templates support `{{firstName}}`, `{{email}}`, and other contact field variables rendered at send time.
- **Broadcasts:** One-off sends to segments (all leads, workshop attendees, Circle members).
- **Workshop emails:** Pre-built templates for before/during/after workshop.
- **Tracking:** Resend webhooks capture opens, clicks, bounces, unsubscribes, and complaints. Stored per-contact.
- **Unsubscribe handling:** Resend includes an unsubscribe link in all marketing emails. When a recipient unsubscribes, Resend fires a webhook to `/api/webhooks/resend`. The handler sets `Contact.unsubscribedAt` and updates any active `SequenceEnrollment` to `UNSUBSCRIBED`. The sequence processor checks `unsubscribedAt` before sending.

### 5.2 Inbound + AI Triage (Gmail API)

- OAuth2 connection to Jonathan's Google Workspace Gmail.
- Cron job runs overnight: reads new emails, categorizes them, drafts replies using Claude API.
- Drafts appear in Messages inbox flagged as "AI Draft — Review Before Sending."
- Jonathan reviews, edits if needed, clicks send. Gmail API sends from his actual address.

### 5.3 Why Resend + Gmail API (not just one)

- **Resend** excels at bulk marketing email: deliverability at scale, open/click tracking, bounce handling, unsubscribe management (CAN-SPAM compliance).
- **Gmail API** excels at personal email: reading inbox, sending as Jonathan's actual email address, maintaining thread context for 1:1 replies.
- At 5,000 subscribers, Resend costs ~$20/month. Gmail API is free within Workspace limits.

---

## 6. Website Integration

### 6.1 Static Site Serving

- Contents of `simpletechskills-site.zip` extracted to `server/public/`.
- Express serves these as static files with a fallback: if no static file matches and path starts with `/crm`, serve the React SPA; otherwise 404.
- All existing pages preserved: homepage, academy, workshop, coaching, cam, ebook, certification, corporate, claude, skills, privacy, terms, success page, etc.

### 6.2 Form Capture

- Existing Kit forms on the website repointed to `POST /api/contacts/signup`.
- Endpoint creates a Contact record, tags them by source page, and enrolls in the appropriate sequence.
- Returns a redirect to the success/thank-you page.

### 6.3 Page View Tracking

- Lightweight JS snippet (`/api/analytics/track`) injected into website pages.
- Logs: page URL, referrer, timestamp, session ID (anonymous cookie).
- When a visitor signs up, their anonymous session is linked to their Contact record.
- No Google Analytics or Tag Manager needed.

---

## 7. Funnel Analytics

### Data Model

```
PageView → (anonymous session cookie)
    ↓ (signup links session to contact)
Contact → FormSignup → EmailOpen → LinkClick → StripePayment
```

### Dashboard Metrics

- **Top of funnel:** Page views by page, unique visitors
- **Middle:** Signups (form submissions), signup rate by page
- **Bottom:** Purchases (Stripe payments), conversion rate
- **Drilldown:** Filter by date range, source page, sequence

### Implementation

- `page_views` table: url, referrer, session_id, contact_id (nullable), timestamp
- `email_events` table: contact_id, email_id, event_type (sent/opened/clicked/bounced), timestamp
- `payments` table: contact_id, stripe_payment_id, amount, product, timestamp
- Dashboard queries aggregate these tables for funnel visualization.

---

## 8. Integrations

### 8.1 Resend

- **Setup:** API key in env vars. Single verified domain (simpletechskills.com).
- **Sending:** `POST /api/emails/send` calls Resend API.
- **Webhooks:** Resend posts open/click/bounce events to `/api/webhooks/resend`. Stored in `email_events`.

### 8.2 Gmail (OAuth2)

- **Setup:** Google Cloud project with Gmail API enabled. OAuth2 credentials stored encrypted in DB.
- **Reading:** `gmail.users.messages.list` + `.get` for new messages.
- **Drafting:** AI agent creates drafts via `gmail.users.drafts.create`.
- **Sending:** When Jonathan approves a draft, `gmail.users.drafts.send`.

### 8.3 Stripe (x2 accounts)

- **Setup:** Two sets of Stripe keys (community + consulting) in env vars.
- **Webhooks:** Both accounts send `checkout.session.completed` and `payment_intent.succeeded` to `/api/webhooks/stripe`.
- **Contact linking:** Payment events matched to Contact by email address.

### 8.4 TickTick (OAuth2)

- **Setup:** TickTick Open API OAuth2 credentials.
- **Push:** Creating a task in CRM creates it in TickTick.
- **Pull:** Periodic sync pulls TickTick task updates (completion, edits) back to CRM.
- **Fallback:** If TickTick API is unavailable, tasks stored locally in CRM.

### 8.5 Circle (Provisional)

This integration and the `CircleMessage` model are provisional pending API capability research. Circle's API may not support DM access, in which case this section and model will be revised.

- **Setup:** Circle API token from admin settings.
- **Members:** Sync Circle member list to CRM contacts (tagged as "Circle Member").
- **DMs:** Read and send DMs via Circle API (pending API capability research — may require polling or webhooks).
- **Display:** Circle DMs appear in the Messages unified inbox alongside Gmail.

---

## 9. Security

Inherits all security decisions from the previous design spec:

- Argon2id password hashing
- TOTP 2FA via authenticator app
- Redis-backed httpOnly/secure/sameSite=lax sessions (7-day expiry, sliding window). `lax` is required because the static website and CRM API share one origin, and form POSTs need cookies.
- Login rate limiting (5 attempts / 15 min per IP)
- Helmet.js security headers
- CORS locked to frontend domain
- CSRF via double-submit cookie (csrf-csrf)
- Zod validation on all endpoints
- Audit logging for all auth events

---

## 10. Data Model Additions

These models extend the v1 Prisma schema. The v1 `Client` model is renamed to `Contact`. The v1 `EmailSequence` and `EmailSequenceEnrollment` models are replaced by the models below.

```prisma
model Contact {
  // Renamed from v1's Client model. All fields from v1 Client carry over.
  // Added fields:
  unsubscribedAt  DateTime?  // Set when contact unsubscribes via Resend webhook
}

model Sequence {
  id          String   @id @default(cuid())
  name        String   // "Evergreen Drip", "Workshop Prep"
  steps       SequenceStep[]
  enrollments SequenceEnrollment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SequenceStep {
  id         String   @id @default(cuid())
  sequenceId String
  sequence   Sequence @relation(fields: [sequenceId], references: [id])
  order      Int
  delayDays  Int      // days after previous step (or enrollment)
  subject    String
  bodyHtml   String
  createdAt  DateTime @default(now())
}

model SequenceEnrollment {
  id          String    @id @default(cuid())
  contactId   String
  contact     Contact   @relation(fields: [contactId], references: [id])
  sequenceId  String
  sequence    Sequence  @relation(fields: [sequenceId], references: [id])
  currentStep Int       @default(0)
  status      EnrollmentStatus @default(ACTIVE)
  enrolledAt  DateTime  @default(now())
  nextSendAt  DateTime?

  @@unique([contactId, sequenceId]) // Prevent double-enrollment
}

model EmailEvent {
  id        String   @id @default(cuid())
  contactId String
  contact   Contact  @relation(fields: [contactId], references: [id])
  emailId   String?  // Resend message ID
  eventType String   // sent, opened, clicked, bounced, complained
  metadata  Json?    // link URL for clicks, etc.
  timestamp DateTime @default(now())
}

model PageView {
  id        String   @id @default(cuid())
  url       String
  referrer  String?
  sessionId String   // anonymous cookie
  contactId String?  // linked after signup
  contact   Contact? @relation(fields: [contactId], references: [id])
  timestamp DateTime @default(now())

  @@index([sessionId])
  @@index([contactId])
  @@index([timestamp])
}

model Broadcast {
  id        String   @id @default(cuid())
  name      String
  subject   String
  bodyHtml  String
  segment   Json     // e.g., { "tags": ["workshop"], "funnelStage": "LEAD" }
  status    BroadcastStatus @default(DRAFT)
  sentAt    DateTime?
  createdAt DateTime @default(now())
}

model CircleMessage {
  id              String   @id @default(cuid())
  circleMessageId String   @unique
  contactId       String?
  contact         Contact? @relation(fields: [contactId], references: [id])
  direction       String   // inbound, outbound
  body            String
  read            Boolean  @default(false)
  timestamp       DateTime
  createdAt       DateTime @default(now())
}

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  PAUSED
  CANCELED       // Manually removed from sequence
  UNSUBSCRIBED   // Opted out via email unsubscribe link
}

enum BroadcastStatus {
  DRAFT
  SENDING
  SENT
}
```

---

## 11. Testing

### Playwright E2E Tests

- Run against `localhost:8006`
- Test suites:
  - Auth: login, 2FA setup, session expiry
  - CRM: create/edit/search contacts, knowledge files
  - Messages: view inbox, send reply
  - Email: create sequence, send broadcast
  - Website: form signup flow (submit form, verify contact created, verify sequence enrollment)
  - Funnel: verify page views tracked, verify signup links session to contact

### Local Development

```bash
make start          # Starts Express on port 8006 + Postgres + Redis
make test           # Vitest unit tests
make test:e2e       # Playwright E2E tests
```

---

## 12. Deployment

- Single Railway service: Express serves both static website and CRM API
- Railway Postgres addon for database
- Railway Redis addon for sessions
- Environment variables for all secrets (Resend key, Stripe keys, Gmail OAuth, TickTick OAuth, Circle token, session secret, etc.)
- Custom domain: simpletechskills.com
- Auto-deploy from GitHub main branch

---

## 13. Migration Plan (from Kit)

1. Export Kit subscriber list as CSV
2. Import into CRM contacts table with "lead" tag
3. Recreate evergreen sequence in CRM sequence builder
4. Update website forms to POST to CRM API instead of Kit
5. Verify Resend deliverability with test sends
6. Pause Kit sequences, activate CRM sequences
7. Monitor for 1 week, then deactivate Kit account

---

## 14. Phase Breakdown (High Level)

1. **Foundation** — Auth, database, Express server, static site serving, port 8006
2. **CRM Core** — Contacts CRUD, knowledge files, tags, search/filter
3. **Email System** — Resend integration, sequences, broadcasts, templates
4. **Messages** — Gmail OAuth2 reading, AI draft agent, unified inbox UI
5. **Payments** — Stripe webhook integration (both accounts), payment history
6. **Tasks** — TickTick OAuth2, bidirectional sync
7. **Funnel Analytics** — Page view tracking, funnel dashboard, conversion metrics
8. **Circle** — API integration, DM inbox, member sync
9. **Playwright Tests** — E2E test suite for all major flows
10. **Kit Migration** — Import subscribers, cutover sequences
