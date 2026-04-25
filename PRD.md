# Dr. AI CRM - Product Requirements Document

**Project:** Dr. AI CRM (Empire CRM)
**Owner:** Jonathan Acuna, Simple Tech Skills Corp
**Last Updated:** 2026-04-25
**Status:** Phase 1 ready to build

---

## Quick Start for Next Session

```
Read PRD.md. Execute Phase 1 using the implementation plan at
docs/superpowers/plans/2026-04-25-phase1-foundation.md

Use superpowers:subagent-driven-development to dispatch agent teams
per task. The plan has 15 tasks with full code, exact file paths,
and verification steps. Build, test, deploy to Railway.
```

---

## 1. What This Is

A self-hosted CRM and operations hub that replaces GoHighLevel for Doctor AI Academy. Jonathan runs a coaching practice like a digital doctor's clinic — one-on-one clients, workshops, email communication, Fathom call recordings. This CRM is the single system to manage all of it.

**Core workflow:** Wake up, open CRM, review AI-drafted email replies, approve/send, check client schedule, do coaching calls, Fathom auto-indexes recordings to clients, end of day everything is tracked.

---

## 2. Architecture Decisions (Locked)

| Decision | Choice | Why |
|----------|--------|-----|
| Backend | Express + TypeScript | Full control, no vendor lock-in |
| ORM | Prisma | Typed schema, migrations, Studio |
| Database | PostgreSQL (Railway) | Relational, JSONB, scalable |
| Sessions | Redis (Railway) | Fast, secure session store |
| Auth | Argon2id + TOTP 2FA | Ironclad for public-facing app with client PII |
| Frontend | React 19 + Vite | Future React Native path for mobile |
| UI | Shadcn UI + Tailwind v4 | Dark mode, accessible, customizable |
| Markdown Editor | Tiptap | Rich editing: headers, checkboxes, links |
| Deploy | Railway (Dockerfile) | Server + Postgres + Redis, one platform |
| Email (server) | googleapis (OAuth2) | Server needs own Gmail creds for cron jobs |
| Email (dev) | Gmail MCP | Available in Claude Code sessions |
| AI Drafting | Claude API (Anthropic SDK) | Email agent uses Claude for draft generation |
| Supabase | REMOVED | Was creating dual-backend complexity, vendor lock-in |

**What was removed:** All Supabase code (migrations, edge functions, RLS, auth provider, data providers). The `src/components/atomic-crm/` directory (~15k LOC) is legacy from Atomic CRM and is not used by the new build. The new app lives entirely in `server/` and `client/`.

---

## 3. Current State

### What Exists (as of 2026-04-25)

**Server (`server/`):**
- Express app with Redis sessions, CORS, health check
- Prisma client singleton
- Auth routes (bcrypt — will upgrade to Argon2 + TOTP)
- Contact CRUD service + routes (will be replaced by Client)
- Workshop service + routes (will be rebuilt in later phase)
- Tests (auth, contacts, workshops)

**Client (`client/`):**
- React 19 + Vite + Tailwind v4 + Shadcn UI
- React Query + React Router v7
- Auth context (useAuth hook)
- API client with credentials
- Layout: AppLayout + Sidebar
- Pages: Login, Dashboard, Contacts list/detail, Workshops list/detail
- StatusBadge component
- Dark theme (zinc-950 bg, gold #d4af37 accents)

**Database (`prisma/`):**
- Prisma schema with: Contact, Workshop, WorkshopRegistration, CoachingSession, ClientKnowledgeFile, Payment, Subscription, EmailSequence, EmailLog, ActivityLog

**Data (`documents/`):**
- Kit subscriber CSV export (~200+ subscribers)
- Circle community member CSV export
- Import script (`scripts/import-data.ts`) using Prisma

**Deployment:**
- `Dockerfile` (multi-stage Node 22, Prisma migrate + start)
- `railway.json` (configured)
- `docker-compose.yml` (Postgres + Redis for local dev)
- Railway CLI installed but not linked to project

### Documents Created This Session

| File | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-04-25-dr-ai-crm-design.md` | Full design spec (reviewed, all issues fixed) |
| `docs/superpowers/plans/2026-04-25-phase1-foundation.md` | 15-task implementation plan for Phase 1 (reviewed, all issues fixed) |
| This file (`PRD.md`) | Pickup document for next session |

---

## 4. User Preferences (Non-Negotiable)

- **List views only.** No Kanban boards anywhere. Everything is filterable/sortable lists.
- **Dark mode.** Navy background, gold accents (Doctor AI brand).
- **Rich markdown editing.** Headers, checkboxes, bullet points, links. Like Notion/ClickUp but simpler.
- **Left sidebar navigation.** Dashboard, Inbox, Clients, Recordings, Broadcasts, Settings.
- **Draft-only email agent.** Nothing sends without user approval.
- **Mobile responsive.** Must work on phone browser. React Native app is future.
- **Env vars for secrets.** Never localStorage. Use VITE_* for frontend, process.env for backend.

---

## 5. Integrations

| Service | Purpose | Auth Method | Phase |
|---------|---------|-------------|-------|
| Gmail | Fetch inbox, AI draft replies, send, broadcasts | OAuth2 (googleapis) | 3 |
| Fathom | Pull recordings + transcripts, auto-assign to clients | API key + webhooks | 2 |
| Stripe (2 accounts) | Payment tracking, subscriptions | API key + webhooks | 4 |
| TickTick | Task creation from email triage | OAuth2 | 3 |
| Claude API | AI email drafting, contact summaries | API key | 3 |
| Kit | One-time CSV import (already built), future webhook sync | API key | 6-7 |

**Gmail requires a one-time OAuth2 setup:**
1. Create Google Cloud project, enable Gmail API
2. Create OAuth2 credentials (Web application)
3. Run consent flow script to get refresh token
4. Store GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN in Railway

---

## 6. Data Model Summary

Full schema in the design spec. Key entities:

- **User** — Admin/team auth with Argon2 + encrypted TOTP secret
- **Client** — Name, email, source, funnel stage, tags, package, session counts
- **ClientKnowledgeFile** — Per-client markdown notes (user-editable). Sessions/emails/payments are computed from relations at read time, not stored as text.
- **Recording** — Fathom recordings with transcript, summary, attendee emails, client assignment
- **Email** — Gmail messages with AI drafts, confidence scores, learning loop diffs
- **EmailAgentConfig** — Singleton: master prompt + routing rules
- **EmailKnowledgeFile** — Singleton: style guide + example bank (before/after pairs)
- **EmailSequence** — Drip sequences triggered by client tags
- **Payment / Subscription** — Stripe data from both accounts
- **Task** — Local task model (syncs to TickTick optionally)
- **Activity** — Audit log for all interactions
- **FunnelTransition** — Stage change history with timestamps

---

## 7. Phased Roadmap

### Phase 1 — Foundation (NEXT: ready to build)
Express + Prisma + Postgres + Argon2/TOTP auth + client list + dashboard + Tiptap knowledge file editor + seed data + Railway deploy.

**Plan:** `docs/superpowers/plans/2026-04-25-phase1-foundation.md` (15 tasks, reviewed)

**Acceptance:** Log in with 2FA, see dashboard, browse client list, open a client, edit markdown notes, persist data.

### Phase 2 — Fathom Integration (Week 1)
Webhook receiver, cron sync backup, recording list page, auto-assign by email, manual assignment, knowledge file sessions section.

### Phase 3 — Email Triage Agent (Week 2)
Gmail OAuth2 setup, fetch cron, AI draft generation (Claude API), inbox page (3-tier list), approve/edit/send, learning loop, TickTick task creation, email knowledge file.

### Phase 4 — Stripe + Payments (Week 3)
Webhook receivers (both accounts), payment/subscription records, auto-match to clients, payment history, MRR dashboard.

### Phase 5 — Email Sequences (Week 4)
Sequence CRUD, auto-enrollment by tag, processing cron (every 15 min), Gmail send with template rendering, broadcasts page.

### Phase 6 — Data Import + Go Live (Week 5)
Kit/Circle CSV import (adapt existing script), bulk Fathom historical import, Stripe historical import, data validation, backup strategy.

### Phase 7 — Polish + Team (Future)
Team accounts (RBAC), React Native mobile, TickTick 2-way sync, Kit API sync, performance marketing dashboard (CAC/LTV/ROAS), AI chatbot widget, backup/DR documentation.

---

## 8. Environment Variables

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
ADMIN_PASSWORD=<strong-password>
TOTP_ENCRYPTION_KEY=<32-byte-hex-for-aes-256-gcm>

# Gmail (Phase 3)
GMAIL_CLIENT_ID=<google-cloud-oauth2-client-id>
GMAIL_CLIENT_SECRET=<google-cloud-oauth2-client-secret>
GMAIL_REFRESH_TOKEN=<obtained-via-consent-flow>

# Integrations (Phase 2+)
FATHOM_API_KEY=<fathom-api-key>
FATHOM_WEBHOOK_SECRET=<fathom-webhook-signing-secret>
STRIPE_COMMUNITY_SECRET_KEY=<stripe-sk-community>
STRIPE_COMMUNITY_WEBHOOK_SECRET=<stripe-whsec-community>
STRIPE_CONSULTING_SECRET_KEY=<stripe-sk-consulting>
STRIPE_CONSULTING_WEBHOOK_SECRET=<stripe-whsec-consulting>
TICKTICK_API_KEY=<ticktick-oauth2-token>
ANTHROPIC_API_KEY=<claude-api-key>
KIT_API_KEY=<kit-api-key>

# App
FRONTEND_URL=https://crm.simpletechskills.com
CRON_SECRET=<secret-for-cron-job-auth>
```

---

## 9. Reference Files

| File | What It Contains |
|------|-----------------|
| `docs/superpowers/specs/2026-04-25-dr-ai-crm-design.md` | Full design spec: data model, API routes, frontend pages, integration flows, security architecture |
| `docs/superpowers/plans/2026-04-25-phase1-foundation.md` | 15-task implementation plan with code for Phase 1 |
| `documents/2026-04-21-6230386.csv` | Kit subscriber export |
| `documents/community_ai_community_*.csv` | Circle community member export |
| `scripts/import-data.ts` | Existing Kit+Circle import script (Prisma-based) |
| `server/src/` | Express backend (auth, contacts, workshops) |
| `client/src/` | React frontend (login, dashboard, contacts, workshops) |
| `prisma/schema.prisma` | Current Prisma schema (will be rewritten in Phase 1 Task 1) |
| `Dockerfile` | Multi-stage Docker build for Railway |
| `docker-compose.yml` | Local dev: Postgres + Redis |

### Client-Gene Reference
`/Users/jonathanacuna/Documents/VS Code Programs/Client - Gene/` contains a reference project showing Jonathan's preferred patterns: markdown build plans, client data tracking with 20+ fields, SOPs as step-by-step checklists, list views (not Kanban), Linear/Attio/Stripe Dashboard design aesthetics.

---

## 10. How to Build

### Option A: Agent Teams (Recommended)

```
Read PRD.md and the implementation plan at
docs/superpowers/plans/2026-04-25-phase1-foundation.md

Use /superpowers:subagent-driven-development to execute the plan.
Dispatch one agent per task. Review between tasks.
```

### Option B: Inline Execution

```
Read PRD.md and the implementation plan at
docs/superpowers/plans/2026-04-25-phase1-foundation.md

Use /superpowers:executing-plans to execute tasks sequentially
with checkpoints for review.
```

### Local Dev Setup

```bash
# Start Postgres + Redis
docker-compose up -d

# Install deps
cd server && npm install
cd ../client && npm install

# Set up env
cp .env.example .env  # edit with your values

# Run migrations + seed
npx prisma migrate dev
npx prisma db seed

# Start dev servers
cd server && npm run dev    # port 3000
cd client && npm run dev    # port 5173 (proxies /api to 3000)
```

---

**End of PRD**
