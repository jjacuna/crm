# Dr. AI CRM - Design Specification

**Project:** Dr. AI CRM (Empire CRM)
**Owner:** Jonathan Acuna, Simple Tech Skills Corp
**Date:** 2026-04-25
**Status:** Approved

---

## 1. Purpose

A self-hosted CRM and operations hub for Doctor AI Academy. Replaces GoHighLevel and consolidates client management, coaching session tracking, email triage, and business operations into a single application.

The user is a solopreneur running a coaching practice ("digital doctor's clinic"). The CRM must let him:

- Track one-on-one coaching clients with rich markdown knowledge files
- Auto-ingest Fathom call recordings and assign them to clients
- Triage email with an AI agent that drafts replies overnight
- Track payments across two Stripe accounts
- Send email sequences for workshop onboarding
- Create TickTick tasks from email triage or client actions
- Operate from a mobile-responsive web UI deployed on Railway

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 19 + TypeScript + Vite | Mobile-responsive, future React Native path |
| UI Components | Shadcn UI + Radix UI | Accessible, customizable, dark mode |
| Styling | Tailwind CSS v4 | Responsive, utility-first |
| Data Fetching | React Query (TanStack Query) | Caching, background refetch, optimistic updates |
| Routing | React Router v7 | File-based routing, nested layouts |
| Forms | React Hook Form | Performant, minimal re-renders |
| Markdown Editor | Tiptap | Rich markdown with checkboxes, headers, links (more mature than MDXEditor, better extension ecosystem) |
| Gmail API | googleapis (Node.js) | OAuth2 with refresh token for server-side Gmail access |
| Backend | Express + TypeScript | Full control, no vendor lock-in |
| ORM | Prisma | Typed schema, migrations, Prisma Studio |
| Database | PostgreSQL (Railway) | Relational, JSONB for flexible fields |
| Sessions | Redis (Railway) | Secure session store, fast lookups |
| Auth | Argon2 + TOTP 2FA + rate limiting | Ironclad security for public-facing app |
| Cron | Railway cron service | Morning email agent, sequence processing |
| Deploy | Railway (Dockerfile) | Server + Postgres + Redis in one platform |

---

## 3. Security Architecture

Public-facing on Railway requires defense-in-depth:

### Authentication
- **Password hashing:** Argon2id (memory-hard, resistant to GPU/ASIC attacks, superior to bcrypt)
- **Two-factor auth (2FA):** TOTP via authenticator app (Google Authenticator, Authy). Required for all users. QR code setup on first login.
- **Session management:** Redis-backed sessions with httpOnly, secure, sameSite=strict cookies. 24-hour expiry with sliding window.
- **Login rate limiting:** 5 attempts per 15 minutes per IP. Lockout with exponential backoff. Uses express-rate-limit + rate-limit-redis.

### Transport & Headers
- **HTTPS only:** Railway provides TLS. HSTS header enforced.
- **Helmet.js:** Sets security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- **CORS:** Locked to the frontend domain only.
- **CSRF:** Double-submit cookie pattern via `csrf-csrf` library (csurf is deprecated and unmaintained).

### API Security
- **Input validation:** Zod schemas on every endpoint. No raw user input reaches Prisma.
- **SQL injection:** Prisma parameterizes all queries by default.
- **Rate limiting:** Global rate limit on all API endpoints (100 req/min per IP).
- **Audit log:** All login attempts, failed and successful, logged with IP and timestamp.

### Future (when team members are added)
- Role-based access control (RBAC) — admin, team member, read-only
- Per-user API keys for integrations
- Session revocation from admin panel

---

## 4. Data Model (Prisma Schema)

### Core Entities

```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  totpSecret     String?  // encrypted at rest with AES-256-GCM using TOTP_ENCRYPTION_KEY
  totpEnabled    Boolean  @default(false)
  firstName      String
  lastName       String
  role           Role     @default(ADMIN)
  lastLoginAt    DateTime?
  loginAttempts  Int      @default(0)
  lockedUntil    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  activities     Activity[]
  emailDrafts    Email[]
}

enum Role {
  ADMIN
  TEAM_MEMBER
  READ_ONLY
}

model Client {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String?
  email           String   @unique
  phone           String?
  company         String?
  title           String?
  source          LeadSource @default(MANUAL)
  funnelStage     FunnelStage @default(LEAD)
  contactType     ContactType @default(LEAD)
  tags            String[]   // Postgres array
  packageName     String?    // coaching package
  sessionsPurchased Int     @default(0)
  sessionsUsed    Int        @default(0)
  city            String?
  state           String?
  country         String?
  linkedinUrl     String?
  websiteUrl      String?
  avatarUrl       String?
  circleId        String?    // Circle community member ID
  kitSubscriberId String?    // Kit subscriber ID
  isActive        Boolean    @default(true)
  firstSeenAt     DateTime   @default(now())
  lastSeenAt      DateTime   @default(now())
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  knowledgeFile   ClientKnowledgeFile?
  recordings      Recording[]
  emails          Email[]
  payments        Payment[]
  subscriptions   Subscription[]
  activities      Activity[]
  sequenceEnrollments EmailSequenceEnrollment[]
  tasks           Task[]
  funnelTransitions FunnelTransition[]
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
```

### Client Knowledge File

```prisma
model ClientKnowledgeFile {
  id        String   @id @default(cuid())
  clientId  String   @unique
  client    Client   @relation(fields: [clientId], references: [id])

  // User-editable rich markdown (the main scratchpad)
  notes     String   @default("")  @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Design note:** Only the `notes` field is stored as markdown. The other "sections" (Contact Info, Sessions, Emails, Payment History) are **computed at read time** from the Client's related records (Recording, Email, Payment). This avoids ever-growing text columns, eliminates stale data, and prevents concurrency issues from multiple processes appending to the same column. The API endpoint `GET /api/clients/:id/knowledge` assembles the full knowledge file view by joining related records.

### Fathom Recordings

```prisma
model Recording {
  id                 String   @id @default(cuid())
  fathomRecordingId  String   @unique
  clientId           String?
  client             Client?  @relation(fields: [clientId], references: [id])
  title              String
  shareUrl           String?
  transcriptMarkdown String?  @db.Text
  summaryMarkdown    String?  @db.Text
  actionItems        String?  @db.Text  // markdown list
  attendeeEmails     String[] // from calendar_invitees
  recordedBy         String?  // recorder email
  recordedAt         DateTime
  assignedAt         DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  activities         Activity[]
}
```

### Email

```prisma
model Email {
  id              String      @id @default(cuid())
  gmailThreadId   String?
  gmailMessageId  String?     @unique
  clientId        String?
  client          Client?     @relation(fields: [clientId], references: [id])
  userId          String?
  user            User?       @relation(fields: [userId], references: [id])

  from            String
  to              String[]
  subject         String
  body            String      @db.Text
  direction       EmailDirection
  status          EmailStatus @default(NEW)

  // AI drafting
  draftBody       String?     @db.Text  // AI-generated draft
  originalDraft   String?     @db.Text  // preserved for learning loop diff
  confidence      Float?      // agent confidence score (0-1)
  ruleMatched     String?     // which rule triggered this draft

  // Actions
  suggestedAction EmailAction? // what the agent recommends
  ticktickTaskId  String?     // if a task was created

  receivedAt      DateTime?
  sentAt          DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum EmailDirection {
  INBOUND
  OUTBOUND
}

enum EmailStatus {
  NEW           // just fetched, not processed
  DRAFT_READY   // AI draft created, awaiting approval
  NEEDS_REVIEW  // agent not confident, needs human review
  APPROVED      // user approved draft
  SENT          // email sent
  ARCHIVED      // dismissed
}

enum EmailAction {
  AUTO_REPLY    // draft a reply
  CREATE_TASK   // create TickTick task
  ARCHIVE       // low priority, archive
  ESCALATE      // needs manual attention
}
```

### Email Agent Rules & Knowledge

```prisma
model EmailAgentConfig {
  id            String   @id @default("singleton")  // single-row table
  masterPrompt  String   @db.Text  // the master routing prompt
  rules         Json     // array of {condition, action, template} rules
  updatedAt     DateTime @updatedAt
}

model EmailKnowledgeFile {
  id            String   @id @default("singleton")  // single-row table
  styleGuide    String   @db.Text  // general email writing rules
  examples      Json     // array of {context, originalDraft, userEdit, finalVersion}
  updatedAt     DateTime @updatedAt
}
```

**Design note:** Both are singleton tables (one row each). The seed script creates the initial row with id="singleton". All reads/writes use `prisma.emailAgentConfig.upsert({ where: { id: "singleton" }, ... })`.

### Email Sequences (Broadcasts)

```prisma
model EmailSequence {
  id          String   @id @default(cuid())
  name        String   // "Workshop Onboarding", "Follow-up Series"
  triggerTag  String   // clients with this tag auto-enroll
  isActive    Boolean  @default(true)
  steps       Json     // [{stepNumber, delayMinutes, subject, bodyTemplate}]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  enrollments EmailSequenceEnrollment[]
}

model EmailSequenceEnrollment {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id])
  sequenceId  String
  sequence    EmailSequence @relation(fields: [sequenceId], references: [id])
  currentStep Int      @default(0)
  nextSendAt  DateTime?
  status      EnrollmentStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([clientId, sequenceId])
}

enum EnrollmentStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELED
}
```

### Payments (Stripe)

```prisma
model Payment {
  id                String        @id @default(cuid())
  clientId          String
  client            Client        @relation(fields: [clientId], references: [id])
  stripePaymentId   String?       @unique
  stripeAccount     StripeAccount // which Stripe account
  amount            Int           // cents
  currency          String        @default("usd")
  status            PaymentStatus @default(PENDING)
  productName       String?
  paymentDate       DateTime
  createdAt         DateTime      @default(now())
}

model Subscription {
  id                    String             @id @default(cuid())
  clientId              String
  client                Client             @relation(fields: [clientId], references: [id])
  stripeSubscriptionId  String?            @unique
  stripeAccount         StripeAccount
  planName              String
  amount                Int                // cents per interval
  interval              BillingInterval
  status                SubscriptionStatus @default(ACTIVE)
  startDate             DateTime
  currentPeriodEnd      DateTime?
  canceledAt            DateTime?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
}

enum StripeAccount {
  COMMUNITY
  CONSULTING
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum SubscriptionStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  CANCELED
  ENDED
}

enum BillingInterval {
  MONTHLY
  YEARLY
}
```

### Tasks (Local + TickTick Sync)

```prisma
model Task {
  id             String     @id @default(cuid())
  clientId       String?
  client         Client?    @relation(fields: [clientId], references: [id])
  emailId        String?
  title          String
  description    String?    @db.Text
  dueDate        DateTime?
  status         TaskStatus @default(PENDING)
  ticktickTaskId String?    // synced to TickTick if available
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELED
}
```

Note: Tasks are stored locally regardless of TickTick availability. TickTick sync is optional and uses their OAuth2 API. If TickTick API access is unreliable, the local Task model is the fallback and primary interface.

### Funnel Stage Transitions

```prisma
model FunnelTransition {
  id            String      @id @default(cuid())
  clientId      String
  client        Client      @relation(fields: [clientId], references: [id])
  fromStage     FunnelStage
  toStage       FunnelStage
  changedBy     String?     // user ID
  notes         String?
  transitionedAt DateTime   @default(now())
}
```

Used for conversion rate analytics between funnel stages. Every stage change on Client also creates a FunnelTransition record.

### Activity Log

```prisma
model Activity {
  id          String       @id @default(cuid())
  clientId    String?
  client      Client?      @relation(fields: [clientId], references: [id])
  recordingId String?
  recording   Recording?   @relation(fields: [recordingId], references: [id])
  userId      String?
  user        User?        @relation(fields: [userId], references: [id])
  type        ActivityType
  summary     String
  metadata    Json?        // flexible extra data
  createdAt   DateTime     @default(now())
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

---

## 5. API Routes

### Auth
```
POST   /api/auth/login          Email + password + TOTP code
POST   /api/auth/logout         Destroy session
GET    /api/auth/me             Current user info
POST   /api/auth/setup-2fa      Generate TOTP secret + QR code
POST   /api/auth/verify-2fa     Verify TOTP code and enable 2FA
```

All list endpoints support pagination: `?page=1&limit=25` (offset-based). Default limit=25, max limit=100.

### Clients
```
GET    /api/clients             List with search, filters (tag, stage, source, type, active), pagination
GET    /api/clients/:id         Full detail: client + knowledge file + recent activity
POST   /api/clients             Create client
PATCH  /api/clients/:id         Update client fields
DELETE /api/clients/:id         Soft delete (isActive = false)
GET    /api/clients/:id/knowledge  Get knowledge file
PATCH  /api/clients/:id/knowledge  Update knowledge file (any section)
```

### Recordings
```
GET    /api/recordings          List with filters (assigned/unassigned, client, date range)
GET    /api/recordings/:id      Full recording with transcript
POST   /api/recordings/:id/assign   Assign to client (auto or manual)
POST   /api/webhooks/fathom     Fathom webhook receiver
```

### Email
```
GET    /api/emails              Inbox list grouped by status (draft_ready, needs_review, new)
GET    /api/emails/:id          Full email with draft
PATCH  /api/emails/:id          Update draft, approve, archive
POST   /api/emails/:id/send     Send approved draft via Gmail
POST   /api/emails/:id/task     Create TickTick task from email
```

### Email Sequences
```
GET    /api/sequences           List all sequences
POST   /api/sequences           Create sequence
PATCH  /api/sequences/:id       Update sequence steps/trigger
GET    /api/sequences/:id/enrollments  List enrolled clients
POST   /api/sequences/:id/enroll       Manually enroll client
```

### Payments
```
GET    /api/payments            List with filters (client, account, status, date range)
POST   /api/webhooks/stripe     Stripe webhook receiver (both accounts)
```

### Settings
```
GET    /api/settings/email-agent    Get master prompt + rules
PATCH  /api/settings/email-agent    Update master prompt + rules
GET    /api/settings/email-knowledge Get email knowledge file
PATCH  /api/settings/email-knowledge Update style guide
GET    /api/settings/integrations   Get integration status (Fathom, Stripe, TickTick)
PATCH  /api/settings/integrations   Update API keys
```

### Dashboard
```
GET    /api/dashboard/stats     Active clients, MRR, sessions this week, pending drafts
GET    /api/dashboard/activity  Recent activity feed
GET    /api/dashboard/upcoming  Upcoming sessions (from Fathom scheduled meetings)
```

### Cron (internal, not exposed)
```
POST   /api/cron/email-triage   Fetch Gmail, run AI agent, create drafts
POST   /api/cron/sequences      Process due sequence steps, send emails
POST   /api/cron/fathom-sync    Pull new Fathom recordings (backup to webhook)
```

---

## 6. Frontend Pages

### Layout
- **Left sidebar** (collapsible on mobile):
  - Logo / "Dr. AI CRM"
  - Dashboard
  - Inbox (with unread badge count)
  - Clients
  - Recordings
  - Broadcasts
  - Settings
- **Main content area** to the right
- **Dark mode by default** — navy background, gold accents (Doctor AI brand)

### Dashboard (`/`)
- Quick stats cards: Active Clients, MRR, Sessions This Week, Drafts Awaiting Review
- Draft emails awaiting approval (top 5, link to Inbox)
- Recent activity feed (last 10 activities across all clients)
- Upcoming sessions (next 3 from Fathom)

### Inbox (`/inbox`)
- Three sections, each a list view:
  1. **Ready to Send** — AI-drafted replies with high confidence. Each row: sender, subject, snippet of draft, Approve/Edit/Archive buttons.
  2. **Needs Review** — Low confidence or no matching rule. Each row: sender, subject, snippet, Reply/Create Task/Archive buttons.
  3. **Low Priority** — Filtered out by rules. Collapsed by default.
- Quick actions inline: Approve (sends), Edit (opens editor), Create TickTick Task, Archive.
- Search and filter by date, client, status.

### Clients (`/clients`)
- List view table: Name, Email, Stage, Source, Tags, Package, Last Seen, Sessions Used/Purchased
- Search bar (searches name + email)
- Filters: Funnel Stage, Contact Type, Source, Tags, Active/Inactive
- Sort by: Name, Last Seen, Created
- Click row to open client detail

### Client Detail (`/clients/:id`)
- **Header:** Name, email, phone, company, stage badge, tags
- **Tabbed sections** (or scrollable single page):
  1. **Contact Info** — Editable fields, package, session count
  2. **Sessions** — Auto-populated list from Fathom recordings. Each: date, title, summary snippet, link to full transcript
  3. **Notes** — Rich markdown editor (Tiptap). Headers, checkboxes, bullet points, links. Auto-saves.
  4. **Emails** — Chronological list of sent/received. Click to expand full body.
  5. **Payment History** — List from Stripe: date, amount, product, status
- **Activity timeline** — Right side or bottom. Low-key chronological log of all interactions.

### Recordings (`/recordings`)
- List view: Title, Date, Duration, Client (or "Unassigned"), Attendees
- Filter: Assigned/Unassigned, Client, Date Range
- Click row to expand: Full transcript (markdown rendered), summary, action items
- Assign button: auto-suggests client by matching attendee email, or manual dropdown search

### Broadcasts (`/broadcasts`)
- List of email sequences: Name, Trigger Tag, Steps Count, Active/Inactive, Enrolled Count
- Click to edit sequence:
  - Name, trigger tag
  - Steps editor: add/remove/reorder steps. Each step: delay (minutes/hours/days), subject, body (markdown template with {{firstName}}, {{email}} variables)
  - Enrollments list: who's in the sequence, what step, when next send
- Manual enroll button to add clients

### Settings (`/settings`)
- **Email Agent:**
  - Master prompt editor (large textarea/markdown)
  - Rules list: condition + action + optional template. Add/edit/remove.
- **Email Knowledge:**
  - Style guide editor (markdown)
  - Example bank viewer: shows before/after pairs from your corrections. Delete bad examples.
- **Integrations:**
  - Fathom: API key input, connection status, test button
  - Stripe Community: API key, webhook URL to configure
  - Stripe Consulting: API key, webhook URL to configure
  - TickTick: API key, default list selection
  - Gmail: OAuth2 connection status, test send button
- **Profile:**
  - Email, name, change password
  - 2FA setup/management

---

## 7. Integration Flows

### Gmail Email Agent (Cron - runs every morning)

```
1. Fetch new emails from Gmail (since last sync)
2. For each email:
   a. Match sender email to Client record
   b. Create Email record (direction=INBOUND, status=NEW)
   c. Create Activity log entry
   d. Run through EmailAgentConfig.masterPrompt + rules:
      - If rule matches with template: generate draft, set confidence, status=DRAFT_READY
      - If no rule but context available: generate draft with lower confidence, status=DRAFT_READY
      - If cannot draft confidently: status=NEEDS_REVIEW, suggestedAction=ESCALATE
      - If rule says ignore: status=ARCHIVED
   e. AI drafting uses: EmailKnowledgeFile (style guide + examples) + Client context (knowledge file, recent activity)
3. Update last sync timestamp
```

### Email Learning Loop

```
1. User opens draft in Inbox
2. If approved as-is:
   - Send via Gmail
   - Log: no correction needed (positive signal for confidence calibration)
3. If user edits draft:
   - Save originalDraft (AI version) and body (user version)
   - Compute diff
   - Auto-append to EmailKnowledgeFile.examples:
     {context, originalDraft, userEdit, finalVersion, clientId, date}
   - Send edited version via Gmail
4. Next time AI drafts for similar context:
   - Retrieve relevant examples from knowledge file
   - Include in prompt as few-shot examples
   - Confidence should increase over time as example bank grows
```

### Fathom Integration

```
Webhook (primary):
1. Fathom sends POST /api/webhooks/fathom when recording ready
2. Verify webhook signature (HMAC-SHA256)
3. Extract: recording_id, title, transcript, summary, action_items, attendee_emails
4. Create Recording record
5. Auto-match: check attendee_emails against Client.email
   - If exactly one match: assign to client, update knowledge file sessions section
   - If multiple matches: flag for manual assignment
   - If no match: leave unassigned
6. Create Activity log entry

Cron (backup, runs hourly):
1. GET https://api.fathom.ai/external/v1/meetings?created_after={lastSync}
   (Fathom REST API confirmed available - requires X-Api-Key header, 60 req/min limit)
2. For each meeting, fetch transcript via GET /recordings/{id}/transcript
3. For any recordings not already in DB, process same as webhook

Note: Fathom API availability depends on account plan. Phase 2 implementation
should test API access early and fall back to webhook-only if REST is unavailable.
Phase 6 historical import depends on the /meetings endpoint supporting date ranges.
```

### Stripe Integration

```
Webhook:
1. POST /api/webhooks/stripe receives events from both accounts
2. Verify signature using stripe.webhooks.constructEvent(body, sig, webhookSecret)
3. Identify which account by matching the webhook secret used for verification
4. For payment_intent.succeeded:
   - Match customer email to Client
   - Create Payment record
   - Update client knowledge file payment section
   - Create Activity log entry
4. For customer.subscription.created/updated/deleted:
   - Match customer email to Client
   - Create/update Subscription record
   - Update client knowledge file
   - Create Activity log entry
```

### TickTick Integration

```
On-demand from Inbox or Client page:
1. User clicks "Create Task" on email or client action
2. POST to TickTick API: title, content (email subject + snippet or client context), due date
3. Save ticktickTaskId on Email or Activity record
4. Create Activity log entry
```

### Email Sequences

```
Cron (runs every 15 minutes):
1. Query EmailSequenceEnrollment where nextSendAt <= now AND status=ACTIVE
2. For each:
   a. Get sequence step template
   b. Render template with client data (firstName, email, etc.)
   c. Send via Gmail
   d. Create Email record (direction=OUTBOUND)
   e. Advance currentStep, calculate nextSendAt from next step delay
   f. If no more steps: status=COMPLETED
   g. Create Activity log entry
```

---

## 8. Phased Roadmap

### Phase 1 - Foundation (Ship Today)

**Goal:** Express + Prisma + Postgres + secure auth + client list + dashboard, deployed on Railway with example data.

Deliverables:
- Express server with TypeScript
- Prisma schema (User, Client, ClientKnowledgeFile, Activity)
- Postgres database on Railway
- Redis for sessions on Railway
- Ironclad auth: Argon2 + TOTP 2FA + rate limiting + Helmet + CORS
- Seed script with example data (10-15 clients from Kit/Circle CSV format)
- React frontend: Login page, Dashboard (stats + recent activity), Clients list view with search/filters, Client detail page with knowledge file (markdown editor for Notes section)
- Left sidebar navigation
- Dark mode (navy + gold Doctor AI brand)
- Railway deployment (Dockerfile)
- Mobile-responsive layout

Acceptance: Log in with 2FA, see dashboard, browse client list, open a client, edit their notes in markdown.

### Phase 2 - Fathom Integration (Week 1)

**Goal:** All coaching recordings indexed and assigned to clients.

Deliverables:
- Fathom webhook receiver
- Fathom cron sync (backup)
- Recording list page with filters
- Auto-assign recordings to clients by email match
- Manual assignment UI
- Auto-populate client knowledge file sessions section
- Activity log entries for recordings

Acceptance: Complete a Fathom call, see it appear in CRM within minutes, auto-assigned to the correct client.

### Phase 3 - Email Triage Agent (Week 2)

**Goal:** Wake up, open Inbox, review AI-drafted replies, approve and send.

**Pre-requisite:** Set up Google Cloud OAuth2 credentials for Gmail API access. This requires:
1. Create a Google Cloud project, enable Gmail API
2. Create OAuth2 credentials (Web application type)
3. Run a one-time CLI consent flow script to obtain a refresh token
4. Store GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN in Railway env vars

Deliverables:
- Gmail OAuth2 setup script (one-time consent flow)
- Gmail fetch cron job (morning run)
- Email agent with master prompt + rules engine
- AI draft generation using Claude API
- Inbox page with three-tier list (ready/review/low priority)
- Approve/Edit/Send workflow
- Email learning loop (save diffs, update knowledge file)
- Email knowledge file + style guide in Settings
- TickTick task creation from email actions
- Activity log entries for emails

Acceptance: Emails fetched overnight, drafts ready in Inbox by morning, approve 3 drafts and send them, edit 1 and see it saved as a learning example.

### Phase 4 - Stripe + Payments (Week 3)

**Goal:** Payment history auto-populates on client records.

Deliverables:
- Stripe webhook receivers (both accounts)
- Payment and Subscription records
- Auto-match to clients by email
- Payment history in client knowledge file
- Session count tracking (purchased vs used)
- Basic MRR calculation for dashboard

Acceptance: Make a test Stripe payment, see it appear on the client's record within minutes.

### Phase 5 - Email Sequences (Week 4)

**Goal:** Workshop students auto-receive email drip sequences.

Deliverables:
- Email sequence CRUD (name, trigger tag, steps with delays)
- Auto-enrollment when client gets a trigger tag
- Sequence processing cron (every 15 min)
- Send via Gmail with template rendering
- Enrollment tracking UI
- Broadcasts page

Acceptance: Tag a client "workshop-may", they automatically receive welcome email, then prep email 3 days later.

### Phase 6 - Data Import + Go Live (Week 5)

**Goal:** Real data replaces example data. CRM is daily driver.

Deliverables:
- Import script for Kit CSV + Circle CSV (adapt existing script to new Prisma schema)
- Bulk Fathom historical import (pull all past recordings)
- Stripe historical import (pull past payments/subscriptions)
- Data validation and deduplication
- Backup strategy (Railway Postgres automated backups)

Acceptance: All real contacts imported, historical Fathom recordings assigned, Stripe history populated. Jonathan uses CRM daily for one full week.

### Phase 7 - Polish + Team (Future)

- Team member accounts with RBAC
- React Native mobile app
- TickTick two-way sync
- Kit form webhook (new subscribers auto-create clients)
- Kit API sync (CRM pushes to Kit as source of truth)
- Advanced email agent rules (per-client personality, context-aware scheduling)
- Performance marketing dashboard (CAC, LTV, ROAS, conversion rates, churn)
- AI chatbot widget (natural language CRUD interface)
- Dashboard customization
- Backup/disaster recovery documentation (RPO/RTO, off-Railway backup)

---

## 9. Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/draicrm

# Redis
REDIS_URL=redis://default:pass@host:6379

# Auth
SESSION_SECRET=<64-char-random-string>
ADMIN_EMAIL=hello@simpletechskills.com
ADMIN_PASSWORD=<initial-password-changed-on-first-login>
TOTP_ENCRYPTION_KEY=<32-byte-hex-key-for-aes-256-gcm>

# Integrations
FATHOM_API_KEY=<fathom-api-key>
FATHOM_WEBHOOK_SECRET=<fathom-webhook-signing-secret>
STRIPE_COMMUNITY_SECRET_KEY=<stripe-sk-community>
STRIPE_COMMUNITY_WEBHOOK_SECRET=<stripe-whsec-community>
STRIPE_CONSULTING_SECRET_KEY=<stripe-sk-consulting>
STRIPE_CONSULTING_WEBHOOK_SECRET=<stripe-whsec-consulting>
TICKTICK_API_KEY=<ticktick-oauth2-token>
ANTHROPIC_API_KEY=<claude-api-key>
KIT_API_KEY=<kit-api-key>  # for future Kit sync (Phase 7)

# Gmail (OAuth2 for server-side access)
# MCP is used during Claude Code sessions; the server needs its own credentials
GMAIL_CLIENT_ID=<google-cloud-oauth2-client-id>
GMAIL_CLIENT_SECRET=<google-cloud-oauth2-client-secret>
GMAIL_REFRESH_TOKEN=<obtained-via-one-time-oauth-consent-flow>
# Required scopes: gmail.readonly, gmail.send, gmail.modify

# App
FRONTEND_URL=https://crm.simpletechskills.com
CRON_SECRET=<secret-for-cron-job-auth>
```

---

## 10. File Structure

```
server/
  src/
    index.ts                 # Express app setup
    config.ts                # Zod-validated env config
    middleware/
      auth.ts                # Session + 2FA verification
      rateLimiter.ts         # Rate limiting config
      security.ts            # Helmet, CORS, CSRF
      validate.ts            # Zod request validation
    routes/
      auth.ts                # Login, logout, 2FA setup
      clients.ts             # Client CRUD + knowledge file
      recordings.ts          # Fathom recordings
      emails.ts              # Email inbox + drafts
      sequences.ts           # Email sequences
      payments.ts            # Payment list
      settings.ts            # Agent config, integrations
      dashboard.ts           # Stats, activity, upcoming
      webhooks.ts            # Fathom + Stripe webhooks
    services/
      emailAgent.ts          # AI email triage + drafting
      fathomSync.ts          # Fathom API client + sync logic
      stripeSync.ts          # Stripe event processing
      ticktick.ts            # TickTick API client
      gmail.ts               # Gmail fetch + send
      sequenceProcessor.ts   # Email sequence cron logic
      knowledgeFile.ts       # Knowledge file auto-population
    cron/
      morningEmail.ts        # Email triage cron entry
      sequenceRunner.ts      # Sequence processing cron entry
      fathomBackup.ts        # Fathom sync backup cron
  prisma/
    schema.prisma            # Full data model
    migrations/              # Prisma migrations
    seed.ts                  # Example data seeder
  Dockerfile
  package.json
  tsconfig.json

client/
  src/
    App.tsx                  # Routes + layout
    main.tsx                 # Entry point
    lib/
      api.ts                 # Fetch wrapper for Express API
    hooks/
      useAuth.tsx            # Auth context + session check
    components/
      layout/
        Sidebar.tsx          # Left nav
        Layout.tsx           # Sidebar + main content wrapper
      ui/                    # Shadcn components
    pages/
      LoginPage.tsx          # Email + password + TOTP
      DashboardPage.tsx      # Stats, drafts, activity, upcoming
      InboxPage.tsx          # Three-tier email list
      ClientsPage.tsx        # Client list with filters
      ClientDetailPage.tsx   # Tabbed: info, sessions, notes, emails, payments
      RecordingsPage.tsx     # Recording list with assign
      BroadcastsPage.tsx     # Sequence list + editor
      SettingsPage.tsx       # Agent config, integrations, profile
  index.html
  vite.config.ts
  tailwind.config.ts
  package.json
  tsconfig.json
```

---

## 11. Key Design Decisions

1. **Single Prisma schema as source of truth.** No Supabase, no dual backends. One schema, one migration path, full type safety from DB to frontend.

2. **Knowledge file sections stored as separate markdown columns.** Not one giant blob. This lets the system auto-populate Sessions and Payments sections without touching the user's Notes section. Each section can be independently updated.

3. **Email learning loop as append-only example bank.** No complex ML. Just accumulate before/after pairs and use them as few-shot examples in the drafting prompt. Simple, effective, improves over time.

4. **Draft-only email agent.** Nothing sends without user approval. Trust is earned gradually. Can loosen to auto-send for specific rules in Phase 7.

5. **Argon2 + TOTP for auth.** Not bcrypt (weaker against GPU attacks). TOTP 2FA is non-negotiable for a public-facing app with client data. No magic links, no SMS (SIM swap vulnerable).

6. **List views only.** No Kanban boards. Clients, recordings, emails, payments are all filterable/sortable lists. Matches the user's workflow and mental model.

7. **Railway as single deploy target.** Server, Postgres, Redis all on Railway. One `railway up` deploys everything. Cron jobs via Railway's cron service.

---

**End of Design Specification**
