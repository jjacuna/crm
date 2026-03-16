**MVP PRODUCT REQUIREMENTS DOCUMENT**

**Doctor AI CRM**

Simple Tech Skills Corp

*Version 2.0 (MVP, Atomic CRM Fork)  |  March 2025  |  Deploy Target: Railway*

| Base Repo | github.com/marmelab/atomic-crm (MIT License, fork and customize) |
| :---- | :---- |
| **Frontend** | React \+ TypeScript \+ Vite \+ shadcn/ui \+ TailwindCSS |
| **Backend** | Supabase (Phase 1\) then Express \+ Prisma on Railway (Phase 2 option) |
| **Database** | PostgreSQL (via Supabase or Railway) |
| **Pipeline UI** | hello-pangea/dnd for Kanban drag and drop |
| **Deploy Target** | Railway (Phase 2+) |
| **Build Approach** | Vibe coding with Claude Code |
| **MVP Target** | 2 to 3 weeks from fork to live |

# **1\. What We Are Building and Why**

This is a lean, custom CRM for Simple Tech Skills Corp. The business runs multiple revenue streams: Saturday Workshops, the AI Empire Academy membership, AI Systems Architect Certification, and corporate consulting. Right now, lead and contact data is scattered across email, TidyCal, Circle, and Stripe with no single source of truth.

This CRM fixes that. Contacts in one place. Leads tracked. Pipeline visible. Tasks managed. Nothing fancy, nothing overbuilt. Get it live, start using it, iterate from there.

We are NOT building from scratch. We are forking Atomic CRM, which already ships with contacts, tasks, a Kanban pipeline, notes, and activity logs under an MIT license. We customize it for our specific offer stack and lead sources, then deploy it.

# **2\. The Build Philosophy**

Three rules for this MVP:

* Ship fast. Done beats perfect. If it is not in Phase 1, it goes on a backlog.

* Customize, do not rebuild. Every feature Atomic CRM already ships is a feature we do not have to write.

* One user. No multi-tenant, no roles, no permissions. Jonathan uses this. That is it for now.

# **3\. What the Fork Already Gives Us (Free)**

By forking Atomic CRM, the following features are ready on day one before we write a single line of custom code:

| Feature | What It Does | Phase |
| :---- | :---- | :---: |
| **Contact Management** | Create, edit, search, filter contacts. Timeline view of all activity per contact. | **1** |
| **Notes on Contacts** | Timestamped notes attached to any contact record. | **1** |
| **Task Management** | Create tasks, set due dates, mark complete. Basic reminder support. | **1** |
| **Deals Pipeline (Kanban)** | Drag-and-drop deal cards across pipeline stages. Deal value and close date fields. | **1** |
| **Activity Log** | Aggregated view of all interactions across contacts and deals. | **1** |
| **CSV Import and Export** | Bulk import contacts from a spreadsheet. Export anytime. | **1** |
| **Single User Login** | Google or email login via Supabase Auth. No multi-user setup needed for MVP. | **1** |
| **Custom Fields** | Add fields to Contacts or Deals directly in Supabase Studio without touching code. | **1** |

# **4\. What We Build On Top (Custom Work)**

Everything below is the delta between the Atomic CRM base and what the business actually needs. This is all the custom work Claude Code will build.

## **4.1 Products Module**

Atomic CRM has no concept of products. This is a new module.

| Feature | What It Does | Phase |
| :---- | :---- | :---: |
| **Product Record** | Name, category (Workshop / Academy / Cert / Corporate), price, active or inactive status. | **1** |
| **Link Product to Contact** | Tag a contact as purchased or interested in a specific product. | **1** |
| **Link Product to Deal** | Each pipeline deal is tied to one product. Drives revenue reporting. | **1** |
| **Product List View** | Simple table of all products with status and price. | **1** |

## **4.2 Pipeline Stage Customization**

Atomic CRM ships with generic pipeline stages. We replace them with stages that match how Simple Tech Skills Corp actually sells.

| \# | Stage Name | What It Means |
| :---: | :---- | :---- |
| **1** | **New Inquiry** | Someone expressed interest via workshop, TikTok, DM, or referral. Not yet contacted. |
| **2** | **Discovery Call Scheduled** | A call or conversation is booked. Actively qualifying. |
| **3** | **Proposal Sent** | An offer or pricing has been shared. Waiting on decision. |
| **4** | **Negotiation** | Active back and forth on terms, timing, or price. |
| **5** | **Closed Won** | Deal accepted. Payment received or contract signed. |
| **6** | **Closed Lost** | Not moving forward. Reason captured for future reference. |

## **4.3 Lead Source Tracking**

Every contact and every deal must have a lead source. This is essential for understanding which channels are driving revenue. We add a lead\_source field to the Contacts table and the Deals table.

| Feature | What It Does | Phase |
| :---- | :---- | :---: |
| **Lead Source Field on Contact** | Dropdown: TikTok LIVE, Workshop, YouTube, Referral, LinkedIn, Cold Outreach, Other. | **1** |
| **Lead Source Field on Deal** | Same dropdown. Carries through from the contact but can be overridden. | **1** |
| **Source Filter on Contact List** | Filter the contacts list by lead source to see which channel has the most contacts. | **1** |

## **4.4 Conversations Log**

Atomic CRM has notes but does not have a structured conversations module. We add a lightweight conversations table that logs real interactions.

| Feature | What It Does | Phase |
| :---- | :---- | :---: |
| **Conversation Record** | Linked contact, date, channel (Phone / Zoom / DM / Email), brief summary, and next step. | **1** |
| **Outcome Field** | Mark the outcome: Follow-up needed, Proposal sent, Closed Won, No action. | **1** |
| **Next Step Creates a Task** | If a next step is entered, the system offers a one-click option to turn it into a task. | **1** |
| **Contact Timeline Integration** | Conversations appear in the contact activity timeline alongside notes and tasks. | **1** |

## **4.5 Dashboard Metrics**

The Atomic CRM base does not ship a business metrics dashboard. We build one screen with the essential numbers.

| Feature | What It Does | Phase |
| :---- | :---- | :---: |
| **Revenue MTD** | Sum of Closed Won deal values in the current calendar month. | **1** |
| **Open Pipeline Value** | Sum of all deal values that are not Closed Won or Closed Lost. | **1** |
| **Open Leads Count** | Count of deals that are not yet won or lost. | **1** |
| **Upcoming Tasks** | List of the next 5 tasks due within 7 days. | **1** |
| **Conversion Rate** | Percentage of deals that moved to Closed Won vs. total closed. | **2** |
| **Revenue by Product** | Bar chart breaking revenue across Workshop, Academy, Cert, Corporate. | **2** |

# **5\. What Is Explicitly Out of Scope for MVP**

This list is a forcing function. If it is not in Phase 1 or Phase 2, we do not touch it until the CRM is live and in daily use.

* Multi-user access and roles

* Email sending from inside the CRM

* Stripe payment sync

* KIT or ConvertKit contact sync

* TikTok lead form webhook

* Automated follow-up sequences

* AI summaries or next-step suggestions

* Mobile app

* Dark mode

* Recurring task logic

# **6\. Phased Build Plan**

Phase numbers in the feature tables above map to this plan. Start Phase 1, get it live, then decide if Phase 2 is worth building.

| Phase | Name | Deliverables | Target |
| :---: | :---- | :---- | :---: |
| **1** | **Fork and Go Live** | Fork Atomic CRM. Configure Supabase. Replace pipeline stages. Add lead\_source field. Add Products module. Add Conversations log. Wire up dashboard metrics. Deploy. | **Week 1 to 2** |
| **2** | **Reporting and Polish** | Conversion rate metric. Revenue by product chart. Export improvements. UX polish based on real usage. Evaluate Railway migration. | **Week 3 to 4** |
| **3** | **Future Integrations** | Stripe sync. KIT contact sync. TikTok lead webhook. Any automation. Only after Phase 1 is in daily use. | **Post-MVP** |

# **7\. Data Model Changes from Atomic CRM Base**

Atomic CRM ships its own Postgres schema. We add the following on top. All changes are made via Supabase Studio (no code required for schema changes).

## **New Table: products**

* id, name, category (enum: workshop / academy / certification / corporate), price, is\_active, created\_at

## **New Table: contact\_products (join)**

* id, contact\_id (FK), product\_id (FK), type (purchased / interested), created\_at

## **New Table: conversations**

* id, contact\_id (FK), date, channel (enum: phone / zoom / dm / email / other), summary, outcome (enum: follow\_up / proposal\_sent / closed\_won / no\_action), next\_step, task\_id (FK, nullable), created\_at

## **Modified Table: contacts (add columns)**

* lead\_source (enum: tiktok / workshop / youtube / referral / linkedin / cold\_outreach / other)

* contact\_type (enum: lead / student / client / corporate / alumni)

## **Modified Table: deals (add columns)**

* product\_id (FK to products table)

* lead\_source (same enum as contacts)

* won\_lost\_reason (text, nullable, required on Closed Won and Closed Lost)

# **8\. How to Start Building This**

Hand this PRD to Claude Code and work through these steps in order. Do not skip steps or jump ahead.

1. Fork the Atomic CRM repo: github.com/marmelab/atomic-crm into your GitHub account.

2. Clone locally and run the local dev environment (Supabase runs via Docker, frontend on Vite at localhost:5173).

3. Open Supabase Studio and apply the schema changes from Section 7: products table, contact\_products table, conversations table, and new columns on contacts and deals.

4. Update the pipeline stages in the Atomic CRM config to match the 6 stages in Section 4.2.

5. Add lead\_source and contact\_type dropdowns to the Contact form and filter bar.

6. Build the Products module: list view, create/edit form, and the link to contacts and deals.

7. Build the Conversations module: log form on contact detail page, outcome field, next step to task conversion.

8. Build the Dashboard page with the 4 Phase 1 metrics: Revenue MTD, Pipeline Value, Open Leads, Upcoming Tasks.

9. Deploy to Supabase.com (backend) and Railway or GitHub Pages (frontend). Verify login and all modules work on production.

# **9\. MVP Done Means**

This is the checklist. When all of these are true, the MVP is complete and Phase 2 begins.

* A contact can be created with a lead source and contact type

* A product can be created and linked to a contact or deal

* A deal can be created, moved through all 6 pipeline stages via drag and drop, and closed with a reason

* A conversation can be logged against a contact and the next step can become a task with one click

* A task appears in the task view with a due date and priority

* The dashboard shows Revenue MTD, Open Pipeline Value, Open Leads Count, and Upcoming Tasks with real data

* The app is deployed and accessible via a public URL

* Login is required to access any data

***Fork first. Customize second. Ship fast. Iterate from real usage.***

Simple Tech Skills Corp  |  simpletechskills.com  |  Confidential