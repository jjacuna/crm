#!/usr/bin/env python3
"""Convert Kit contacts and Circle subscriptions CSVs to FakeRest TypeScript data files."""

import csv
import json
import os
from datetime import datetime

BASE_DIR = "/Users/jonathanacuna/Documents/VS Code Programs/CRM"
KIT_CSV = "/Users/jonathanacuna/Downloads/2026-03-16-6117309 (1).csv"
CIRCLE_CSV = "/Users/jonathanacuna/Downloads/Subscriptions-2026-03-16T21-25-33Z.csv"
OUT_DIR = os.path.join(BASE_DIR, "src/components/atomic-crm/providers/fakerest/dataGenerator")


def parse_lead_source(referrer, utm_source):
    referrer = (referrer or "").lower().strip()
    utm_source = (utm_source or "").lower().strip()
    combined = referrer + " " + utm_source
    if "tiktok" in combined:
        return "tiktok"
    if "youtube" in combined:
        return "youtube"
    if "instagram" in combined or "facebook" in combined:
        return "referral"
    if "linkedin" in combined:
        return "linkedin"
    if "meetup" in combined:
        return "referral"
    return "other"


def parse_tags_to_funnel_and_type(tags_str):
    tags = tags_str if tags_str else ""
    funnel_stage = "lead"
    contact_type = "lead"

    if "Paid - AI Consultant Certification" in tags or "2.0 Paid - AI Consultant Certification" in tags:
        funnel_stage = "ai_consultant"
        contact_type = "client"
    elif "Paid: Claude Code Course" in tags or "3.0 Paid: Claude Code Course" in tags:
        funnel_stage = "community_member"
        contact_type = "client"
    elif "1.0 Paid Member AI Community" in tags:
        funnel_stage = "community_member"
        contact_type = "client"
    elif "ACTIVE Workshop" in tags or "ARCHIVE Workshop" in tags:
        funnel_stage = "workshop_attendee"
        contact_type = "student"
    elif "0.1 AI Consultant Leads" in tags:
        funnel_stage = "lead"
        contact_type = "lead"
    # default already set to lead/lead

    return funnel_stage, contact_type


def parse_status(status_str):
    if status_str and status_str.strip().lower() == "active":
        return "active"
    return "inactive"


def escape_ts_string(s):
    """Escape a string for use in TypeScript."""
    if s is None:
        return "null"
    s = s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "")
    return f'"{s}"'


def main():
    # ---- Read Kit contacts ----
    contacts = []
    email_to_contact_id = {}

    with open(KIT_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            contact_id = i + 1
            first_name = (row.get("first_name") or "").strip()
            email = (row.get("email") or "").strip()

            if not email:
                continue

            # Split name if it contains spaces
            parts = first_name.split() if first_name else []
            if len(parts) >= 2:
                fn = parts[0]
                ln = " ".join(parts[1:])
            elif len(parts) == 1:
                fn = parts[0]
                ln = ""
            else:
                fn = email.split("@")[0]
                ln = ""

            created_at = (row.get("created_at") or "").strip()
            tags_str = (row.get("tags") or "").strip()
            city = (row.get("city") or "").strip()
            state = (row.get("state") or "").strip()
            country = (row.get("country") or "").strip()
            referrer = (row.get("referrer") or "").strip()
            utm_source = (row.get("utm_source") or "").strip()
            status = parse_status(row.get("status"))
            funnel_stage, contact_type = parse_tags_to_funnel_and_type(tags_str)
            lead_source = parse_lead_source(referrer, utm_source)

            contact = {
                "id": contact_id,
                "first_name": fn,
                "last_name": ln,
                "gender": "nonbinary",
                "title": "",
                "company_id": None,
                "company_name": "",
                "email_jsonb": [{"email": email, "type": "Work"}],
                "phone_jsonb": [],
                "background": "",
                "avatar": None,
                "first_seen": created_at,
                "last_seen": created_at,
                "has_newsletter": True,
                "status": status,
                "tags": [],
                "sales_id": 0,
                "nb_tasks": 0,
                "linkedin_url": None,
                "lead_source": lead_source,
                "contact_type": contact_type,
                "funnel_stage": funnel_stage,
                "funnel_stage_changed_at": created_at,
            }
            contacts.append(contact)
            email_to_contact_id[email.lower()] = contact_id

    print(f"Parsed {len(contacts)} contacts")

    # ---- Read Circle subscriptions ----
    subscriptions = []
    payments = []

    with open(CIRCLE_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            sub_id = i + 1
            member_email = (row.get("Member email") or "").strip().lower()
            contact_id = email_to_contact_id.get(member_email)

            status_raw = (row.get("Status") or "").strip().lower()
            if status_raw == "active":
                status = "active"
            elif status_raw == "trialing" or status_raw == "trial":
                status = "trial"
            elif status_raw == "canceled" or status_raw == "cancelled":
                status = "canceled"
            elif status_raw == "past_due":
                status = "past_due"
            else:
                status = "canceled"

            start_date = (row.get("Start date") or "").strip()
            renews_on = (row.get("Renews on") or "").strip()
            ended_at = (row.get("Ended at") or "").strip()
            price_amount_str = (row.get("Price amount") or "0").strip()
            price_interval = (row.get("Price interval") or "monthly").strip().lower()
            paywall_name = (row.get("Paywall name") or "").strip()
            currency = (row.get("Currency") or "usd").strip().lower()

            try:
                amount = float(price_amount_str)
            except ValueError:
                amount = 0

            billing_interval = "yearly" if price_interval == "yearly" else "monthly"

            sub = {
                "id": sub_id,
                "contact_id": contact_id,
                "plan_name": paywall_name,
                "status": status,
                "billing_interval": billing_interval,
                "amount": amount,
                "start_date": start_date if start_date else None,
                "end_date": ended_at if ended_at else None,
                "canceled_at": ended_at if (ended_at and status in ("canceled", "ended")) else None,
                "created_at": start_date if start_date else datetime.now().isoformat(),
            }
            subscriptions.append(sub)

            # Create a payment record for active/trial subscriptions
            if status in ("active", "trial") and amount > 0:
                payment = {
                    "id": len(payments) + 1,
                    "contact_id": contact_id,
                    "amount": amount,
                    "payment_date": start_date if start_date else datetime.now().isoformat(),
                    "payment_type": "subscription",
                    "description": f"{paywall_name} - {billing_interval}",
                    "created_at": start_date if start_date else datetime.now().isoformat(),
                }
                payments.append(payment)

    print(f"Parsed {len(subscriptions)} subscriptions")
    print(f"Generated {len(payments)} payments")

    # ---- Write TypeScript files ----

    # Contacts
    lines = []
    lines.append('import type { Contact } from "../../../types";')
    lines.append("")
    lines.append("export const realContacts: (Contact & { id: number })[] = [")
    for c in contacts:
        email_json = json.dumps(c["email_jsonb"])
        phone_json = json.dumps(c["phone_jsonb"])
        tags_json = json.dumps(c["tags"])
        company_id = "null" if c["company_id"] is None else str(c["company_id"])
        avatar = "undefined" if c["avatar"] is None else json.dumps(c["avatar"])
        linkedin = "null" if c["linkedin_url"] is None else escape_ts_string(c["linkedin_url"])

        lines.append("  {")
        lines.append(f'    id: {c["id"]},')
        lines.append(f'    first_name: {escape_ts_string(c["first_name"])},')
        lines.append(f'    last_name: {escape_ts_string(c["last_name"])},')
        lines.append(f'    gender: {escape_ts_string(c["gender"])},')
        lines.append(f'    title: {escape_ts_string(c["title"])},')
        lines.append(f"    company_id: {company_id},")
        lines.append(f'    company_name: {escape_ts_string(c["company_name"])},')
        lines.append(f"    email_jsonb: {email_json},")
        lines.append(f"    phone_jsonb: {phone_json},")
        lines.append(f'    background: {escape_ts_string(c["background"])},')
        lines.append(f"    avatar: {avatar},")
        lines.append(f'    first_seen: {escape_ts_string(c["first_seen"])},')
        lines.append(f'    last_seen: {escape_ts_string(c["last_seen"])},')
        lines.append(f'    has_newsletter: {str(c["has_newsletter"]).lower()},')
        lines.append(f'    status: {escape_ts_string(c["status"])},')
        lines.append(f"    tags: {tags_json},")
        lines.append(f'    sales_id: {c["sales_id"]},')
        lines.append(f'    nb_tasks: {c["nb_tasks"]},')
        lines.append(f"    linkedin_url: {linkedin},")
        lines.append(f'    lead_source: {escape_ts_string(c["lead_source"])},')
        lines.append(f'    contact_type: {escape_ts_string(c["contact_type"])},')
        lines.append(f'    funnel_stage: {escape_ts_string(c["funnel_stage"])},')
        lines.append(f'    funnel_stage_changed_at: {escape_ts_string(c["funnel_stage_changed_at"])},')
        lines.append("  },")
    lines.append("];")
    lines.append("")

    with open(os.path.join(OUT_DIR, "realContacts.ts"), "w") as f:
        f.write("\n".join(lines))
    print(f"Wrote realContacts.ts ({len(contacts)} contacts)")

    # Subscriptions
    lines = []
    lines.append('import type { Subscription } from "../../../types";')
    lines.append("")
    lines.append("export const realSubscriptions: (Subscription & { id: number })[] = [")
    for s in subscriptions:
        contact_id = "null" if s["contact_id"] is None else str(s["contact_id"])
        start_date = escape_ts_string(s["start_date"]) if s["start_date"] else "null"
        end_date = escape_ts_string(s["end_date"]) if s["end_date"] else "null"
        canceled_at = escape_ts_string(s["canceled_at"]) if s["canceled_at"] else "null"

        lines.append("  {")
        lines.append(f'    id: {s["id"]},')
        lines.append(f"    contact_id: {contact_id},")
        lines.append(f'    plan_name: {escape_ts_string(s["plan_name"])},')
        lines.append(f'    status: {escape_ts_string(s["status"])},')
        lines.append(f'    billing_interval: {escape_ts_string(s["billing_interval"])},')
        lines.append(f'    amount: {s["amount"]},')
        lines.append(f"    start_date: {start_date},")
        lines.append(f"    end_date: {end_date},")
        lines.append(f"    canceled_at: {canceled_at},")
        lines.append(f'    created_at: {escape_ts_string(s["created_at"])},')
        lines.append("  },")
    lines.append("];")
    lines.append("")

    with open(os.path.join(OUT_DIR, "realSubscriptions.ts"), "w") as f:
        f.write("\n".join(lines))
    print(f"Wrote realSubscriptions.ts ({len(subscriptions)} subscriptions)")

    # Payments
    lines = []
    lines.append('import type { Payment } from "../../../types";')
    lines.append("")
    lines.append("export const realPayments: (Payment & { id: number })[] = [")
    for p in payments:
        contact_id = "null" if p["contact_id"] is None else str(p["contact_id"])
        lines.append("  {")
        lines.append(f'    id: {p["id"]},')
        lines.append(f"    contact_id: {contact_id},")
        lines.append(f'    amount: {p["amount"]},')
        lines.append(f'    payment_date: {escape_ts_string(p["payment_date"])},')
        lines.append(f'    payment_type: {escape_ts_string(p["payment_type"])},')
        lines.append(f'    description: {escape_ts_string(p["description"])},')
        lines.append(f'    created_at: {escape_ts_string(p["created_at"])},')
        lines.append("  },")
    lines.append("];")
    lines.append("")

    with open(os.path.join(OUT_DIR, "realPayments.ts"), "w") as f:
        f.write("\n".join(lines))
    print(f"Wrote realPayments.ts ({len(payments)} payments)")


if __name__ == "__main__":
    main()
