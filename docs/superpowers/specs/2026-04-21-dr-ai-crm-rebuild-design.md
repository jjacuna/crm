# Dr. AI CRM — Full Rebuild Design Spec

**Date:** 2026-04-21
**Author:** Claude + Jonathan Acuna
**Status:** Approved

## 1. Problem Statement

Jonathan runs Simple Tech Skills / Doctor AI — an AI education and coaching business with weekly workshops ($250), three coaching tiers ($500/$1,000/$2,500/mo), an AI Empire Academy ($49/mo), and an AI Systems Architect Certification. Current operations are manual: workshop students tracked via Kit tags, coaching sessions unlogged, no single source of truth for contacts, no automated email sequences, and ~48% lead leakage from TikTok.

The existing Atomic CRM fork uses Supabase, which adds unnecessary complexity. This is a clean rebuild on Postgres + Railway.

## 2. Goals

1. **Single source of truth** for every contact across all products/services
2. **Automated workshop pipeline** — Stripe purchase → registration → reminder emails → follow-up → funnel progression
3. **Coaching session management** — real-time transcription, AI-assisted coaching, auto-generated summaries, client knowledge files
4. **Email integration** — send/receive from hello@simpletechskills.com within the CRM
5. **Revenue intelligence** — Stripe monitoring, lead scoring, funnel dashboards
6. **Automation heartbeat** — the system moves leads through the funnel, sends follow-ups, and surfaces insights without manual intervention

## 3. Non-Goals (Explicit)

- Multi-user/multi-tenant (single user: Jonathan)
- Mobile app
- Circle integration (API requires $199/mo Business plan — defer)
- Cal.com migration (separate project, keep TidyCal + Zapier for now)
- Custom domain email server (use Resend for sending, separate IMAP integration for reading)

## 4. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + TypeScript + Vite | Proven stack, reuse patterns from existing CRM |
| UI | Tailwind CSS v4 + shadcn/ui | Clean, consistent, accessible components |
| Backend | Express.js + TypeScript | Simple, flexible, handles webhooks well |
| ORM | Prisma | Type-safe DB access, migrations, Railway-native |
| Database | PostgreSQL (Railway) | Relational, proven, handles all our query patterns |
| Job Queue | BullMQ + Redis (Railway) | Scheduled emails, cron jobs, async processing |
| Email | Resend | Transactional + scheduled sending, 3k/mo free |
| Auth (outer) | Cloudflare Zero Trust | Only Jonathan can reach the app |
| Auth (inner) | Express sessions + bcrypt | Simple password login as second layer |
| Real-time | WebSocket (ws) | Live coaching transcription |
| Transcription | Web Speech API (browser) | Free, built into Chrome, good enough for MVP |
| AI | OpenRouter (Claude) | Coaching suggestions, email drafting, summaries |
| Payments | Stripe webhooks | Auto-detect purchases, assign tiers |
| Deployment | Docker + Railway | Proven pattern from Content-Automation-Machine 2.0 |
| Testing | Vitest (unit) + Playwright (E2E) | Full coverage, headless browser testing |

## 5. Architecture

```
Cloudflare Zero Trust
        │
        ▼
┌─────────────────────────────────────────┐
│              Railway                     │
│                                          │
│  ┌────────────┐  ┌──────────┐  ┌──────┐│
│  │ Web Service │  │  Worker  │  │Redis ││
│  │ Express API │  │  BullMQ  │  │      ││
│  │ + React SPA │  │  Emails  │  │      ││
│  │ + WebSocket │  │  Crons   │  │      ││
│  └─────┬──────┘  └────┬─────┘  └──────┘│
│        │               │                │
│  ┌─────▼───────────────▼──────┐         │
│  │       PostgreSQL           │         │
│  └────────────────────────────┘         │
└─────────────────────────────────────────┘
      │           │           │
 ┌────▼───┐  ┌───▼────┐  ┌───▼───┐
 │ Stripe │  │ Resend │  │Kit API│
 └────────┘  └────────┘  └───────┘
```

### Services

**Web Service (Express):**
- Serves React SPA (static build)
- REST API for all CRUD operations
- Stripe webhook endpoint (`/api/webhooks/stripe`)
- WebSocket server for live coaching transcription
- Cloudflare JWT validation middleware
- Session-based auth middleware

**Worker Service (BullMQ):**
- `email-scheduler` queue: processes scheduled reminder/follow-up emails via Resend
- `workshop-cron` job: checks upcoming workshops, enqueues reminders at correct times
- `kit-sync` job: periodic pull from Kit API to sync new subscribers
- `lead-score` job: recalculates lead scores after activity events
- `session-summarizer` job: sends completed transcripts to Claude for summary generation

## 6. Data Model

### contacts
```sql
id              UUID PRIMARY KEY
first_name      TEXT NOT NULL
last_name       TEXT
email           TEXT UNIQUE NOT NULL
phone           TEXT
lead_source     TEXT CHECK (tiktok|workshop|youtube|referral|linkedin|cold_outreach|other)
contact_type    TEXT CHECK (lead|student|client|corporate|alumni)
funnel_stage    TEXT CHECK (lead|workshop_attendee|community_member|coaching_client)
status          TEXT CHECK (active|archived|deleted) DEFAULT 'active'
lead_score      INTEGER DEFAULT 0
stripe_customer_id TEXT
kit_subscriber_id  TEXT
tags            TEXT[]
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### workshops
```sql
id              UUID PRIMARY KEY
title           TEXT NOT NULL
date            TIMESTAMPTZ NOT NULL
zoom_link       TEXT
status          TEXT CHECK (upcoming|in_progress|completed) DEFAULT 'upcoming'
max_capacity    INTEGER DEFAULT 50
stripe_product_id TEXT
price_cents     INTEGER DEFAULT 25000
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```
Note: Reminder/follow-up send status is tracked via `email_log` queries, not boolean flags on the workshop. This is more flexible and supports per-registrant tracking.

### workshop_registrations
```sql
id              UUID PRIMARY KEY
workshop_id     UUID REFERENCES workshops(id) ON DELETE CASCADE
contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE
registered_at   TIMESTAMPTZ DEFAULT NOW()
payment_status  TEXT CHECK (paid|pending|refunded) DEFAULT 'pending'
stripe_payment_id TEXT
attended        BOOLEAN DEFAULT NULL
survey_completed BOOLEAN DEFAULT FALSE
source          TEXT CHECK (stripe|manual|kit_import) DEFAULT 'manual'
notes           TEXT
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(workshop_id, contact_id)
```

### subscriptions (coaching + academy recurring)
```sql
id              UUID PRIMARY KEY
contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL
stripe_subscription_id TEXT UNIQUE
stripe_account  TEXT CHECK (community|consulting) NOT NULL
product_type    TEXT CHECK (coaching_foundations|coaching_business|coaching_elite|academy)
status          TEXT CHECK (active|past_due|cancelled|paused) DEFAULT 'active'
current_period_start TIMESTAMPTZ
current_period_end   TIMESTAMPTZ
amount_cents    INTEGER NOT NULL
currency        TEXT DEFAULT 'usd'
cancelled_at    TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### coaching_sessions
```sql
id              UUID PRIMARY KEY
contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE
tier            TEXT CHECK (foundations_500|business_1000|elite_2500) NOT NULL
session_number  INTEGER NOT NULL
scheduled_at    TIMESTAMPTZ
completed_at    TIMESTAMPTZ
transcript      TEXT
summary         TEXT
action_items    JSONB
knowledge_file_updated BOOLEAN DEFAULT FALSE
fathom_recording_id TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### client_knowledge_files
```sql
id              UUID PRIMARY KEY
contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE UNIQUE
content         TEXT DEFAULT ''
last_session_date TIMESTAMPTZ
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### payments
```sql
id              UUID PRIMARY KEY
contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL
stripe_payment_id TEXT UNIQUE
stripe_customer_id TEXT
amount_cents    INTEGER NOT NULL
currency        TEXT DEFAULT 'usd'
product_type    TEXT CHECK (workshop|coaching_foundations|coaching_business|coaching_elite|academy|certification)
stripe_account  TEXT CHECK (community|consulting)
status          TEXT CHECK (succeeded|pending|refunded) DEFAULT 'pending'
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### email_sequences
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
trigger_type    TEXT CHECK (workshop_registered|workshop_3day_before|workshop_1day_before|workshop_1hr_before|workshop_completed|coaching_session_completed)
subject         TEXT NOT NULL
body_html       TEXT NOT NULL
body_text       TEXT
delay_minutes   INTEGER DEFAULT 0
active          BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### email_log
```sql
id              UUID PRIMARY KEY
contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL
sequence_id     UUID REFERENCES email_sequences(id) ON DELETE SET NULL
workshop_id     UUID REFERENCES workshops(id) ON DELETE SET NULL
session_id      UUID REFERENCES coaching_sessions(id) ON DELETE SET NULL
sent_at         TIMESTAMPTZ DEFAULT NOW()
resend_message_id TEXT
status          TEXT CHECK (sent|delivered|opened|bounced) DEFAULT 'sent'
```

### activity_log
```sql
id              UUID PRIMARY KEY
contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE
action          TEXT NOT NULL
metadata        JSONB
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Lead Score Rules (computed, not a table)
| Action | Points |
|--------|--------|
| registered_workshop | +10 |
| attended_workshop | +20 |
| completed_survey | +5 |
| opened_email | +2 |
| purchased_coaching | +50 |
| coaching_session_completed | +10 |
| purchased_academy | +30 |

## 7. API Routes

### Auth
- `POST /api/auth/login` — password login (behind Cloudflare Zero Trust)
- `POST /api/auth/logout` — destroy session
- `GET /api/auth/me` — current user

### Contacts
- `GET /api/contacts` — list with filters (lead_source, contact_type, funnel_stage, search)
- `GET /api/contacts/:id` — detail with timeline (activities, registrations, sessions, payments)
- `POST /api/contacts` — create
- `PATCH /api/contacts/:id` — update
- `DELETE /api/contacts/:id` — soft delete
- `POST /api/contacts/import-kit` — pull from Kit by tag

### Workshops
- `GET /api/workshops` — list (upcoming, past)
- `GET /api/workshops/:id` — detail with registrations
- `POST /api/workshops` — create (title, date, zoom_link)
- `PATCH /api/workshops/:id` — update
- `POST /api/workshops/:id/register` — manual registration
- `POST /api/workshops/:id/mark-attendance` — bulk mark attended/not

### Coaching Sessions
- `GET /api/sessions` — list by contact or all
- `POST /api/sessions` — create
- `PATCH /api/sessions/:id` — update (transcript, summary, action_items)
- `POST /api/sessions/:id/summarize` — send transcript to Claude, get summary
- `GET /api/sessions/:id/knowledge` — get client knowledge file

### Payments
- `GET /api/payments` — list with filters
- `GET /api/payments/stats` — revenue MTD, by product, etc.

### Webhooks
- `POST /api/webhooks/stripe` — Stripe checkout.session.completed
- `POST /api/webhooks/tidycal` — Zapier bridge for new bookings

### Email
- `GET /api/email/sequences` — list templates
- `POST /api/email/sequences` — create/update template
- `POST /api/email/send` — manual send to contact
- `GET /api/email/log` — sent email history

### WebSocket
- `ws://host/ws/coaching` — real-time transcription + AI coaching suggestions

### Dashboard
- `GET /api/dashboard` — aggregated stats (revenue, pipeline, lead sources, upcoming)

## 8. Frontend Pages

1. **Dashboard** — KPIs (revenue MTD, active students, upcoming workshops, pipeline value), recent activity feed
2. **Workshops** — list of upcoming/past workshops, create new, view registrations per workshop
3. **Workshop Detail** — registrations table, attendance tracking, email status per student
4. **Contacts** — searchable/filterable list, lead score column, funnel stage badges
5. **Contact Detail** — full timeline (workshops attended, sessions, payments, emails, activities), knowledge file, lead score breakdown
6. **Coaching Sessions** — list of upcoming/past sessions, link to contact
7. **Live Session** — real-time transcription panel, "Give me an answer" button, session notes, end-session summary
8. **Email Templates** — manage reminder/follow-up templates
9. **Settings** — API keys, email domain config, Kit sync trigger
10. **Login** — simple email/password form (behind Cloudflare Zero Trust)

## 9. UI/UX Principles

- **Dark theme primary** (matches Doctor AI brand — black/gold from simpletechskills.com)
- **shadcn/ui components** for consistency and accessibility
- **Responsive** but desktop-first (Jonathan uses this at his desk)
- **Data-dense** — show more information, fewer clicks. Tables with inline actions.
- **Status badges** with color coding (green = active/paid, yellow = pending, red = overdue/lost)
- **Toast notifications** for async actions (email sent, payment received)
- **Command palette** (Cmd+K) for quick navigation and actions

## 10. Security Notes

- **Webhook routes** (`/api/webhooks/*`) must bypass session auth and Cloudflare Zero Trust validation. They authenticate via their own mechanisms (Stripe signature, Zapier shared secret).
- **Session store** uses Redis via `connect-redis` — not in-memory, so sessions survive deploys.
- **Cloudflare JWKS** keys are cached at startup with periodic refresh. If CF is unreachable, session-only auth is allowed (for local dev). In production, CF JWT is required.
- **CORS** configured for Vite dev server (localhost:5173) in development only.
- **WebSocket upgrade** handler registered before SPA catch-all route to prevent path collision.
- **Database backups** via Railway Pro plan point-in-time recovery (document backup strategy post-deploy).

## 11. Testing Strategy

- **Unit tests (Vitest):** Prisma queries, lead scoring logic, email scheduling logic, Stripe webhook parsing, API route handlers
- **E2E tests (Playwright):** Login flow, create workshop, register student, view contact timeline, live session recording
- **Webhook testing:** Mock Stripe events, verify contact/payment creation
- **Email testing:** Verify Resend API calls with correct templates and scheduling

## 11. Phased Build Plan

### Phase 1 — Workshop Tracker (split into sub-phases)

**Phase 1a — Scaffold + Core CRUD (Day 1 quick win)**
- Project scaffold: Express + React + Vite + Prisma + Docker + Railway config
- Database: contacts, workshops, registrations, payments, subscriptions, activity_log
- Basic CRUD API for contacts and workshops
- React frontend: login page, contacts list + detail, workshops list + create (paste Zoom link + date)
- Session auth (bcrypt + express-session + connect-redis)
- Dark theme with Doctor AI brand (black/gold)
- Deploy skeleton to Railway
- Unit tests for API routes

**Phase 1b — Stripe + Registration (Day 2)**
- Stripe webhook handler (dual-account: community + consulting)
- Auto-create contact + registration on workshop purchase
- Payment recording with product type detection
- Manual registration from workshop detail page
- Attendance tracking UI
- Unit tests for webhook parsing

**Phase 1c — Email Automation (Day 3)**
- BullMQ worker + Redis setup
- Resend integration with domain verification
- Email sequence templates (3 pre-workshop reminders, 2 post-workshop follow-ups)
- Workshop cron job: auto-enqueue reminders based on workshop dates
- Email log tracking (sent/delivered/opened via Resend webhooks)
- Unit tests for scheduling logic

**Phase 1d — Import + Security + Polish (Day 4)**
- Kit API import: pull subscribers by tag into contacts
- Cloudflare Zero Trust JWT validation middleware
- Contact detail timeline (activities, registrations, payments, emails)
- Dashboard: upcoming workshops, recent registrations, revenue MTD
- Playwright E2E tests: full workshop flow
- Webhook auth: Stripe signature verification, Zapier shared secret

### Phase 2 — Coaching Client Management (Week 2)
- coaching_sessions + client_knowledge_files tables
- Live session mode with Web Speech API transcription
- Claude integration for real-time coaching suggestions
- Post-session AI summary generation
- Fathom transcript linking
- TidyCal → Zapier → webhook for booking notifications
- Invoice tracking on contact detail

### Phase 3 — Email Hub (Week 3)
- IMAP integration for reading hello@simpletechskills.com
- AI-assisted reply drafting
- Rich text editor for composing
- Email thread view per contact

### Phase 4 — Funnel Intelligence (Week 4)
- Full Stripe monitoring (all products)
- Auto funnel stage progression
- Lead scoring engine
- Kanban pipeline board
- Revenue dashboard with charts

### Phase 5 — Integrations + Polish (Ongoing)
- Circle sync (if API access available)
- Cal.com migration
- Kit bi-directional sync
- Multi-step automation sequences
- Client portal (read-only)

## 12. Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth
SESSION_SECRET=...
ADMIN_EMAIL=...
ADMIN_PASSWORD_HASH=...

# Stripe (two accounts: community + consulting)
STRIPE_SECRET_KEY_COMMUNITY=...
STRIPE_WEBHOOK_SECRET_COMMUNITY=...
STRIPE_SECRET_KEY_CONSULTING=...
STRIPE_WEBHOOK_SECRET_CONSULTING=...

# Resend
RESEND_API_KEY=...
RESEND_FROM_EMAIL=hello@simpletechskills.com

# AI
OPENROUTER_API_KEY=...

# Kit
KIT_API_KEY=...

# Fathom
FATHOM_API_KEY=...

# Cloudflare
CF_ACCESS_TEAM_DOMAIN=...
CF_ACCESS_AUD=...
```

## 13. Railway Services

| Service | Type | Est. Cost |
|---------|------|-----------|
| Web (Express + React) | Docker | ~$5/mo |
| Worker (BullMQ) | Docker | ~$3/mo |
| PostgreSQL | Plugin | $5/mo |
| Redis | Plugin | $5/mo |
| **Total** | | **~$18/mo** |
