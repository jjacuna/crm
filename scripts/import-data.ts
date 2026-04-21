/**
 * Import Kit subscribers + Circle community members into Dr. AI CRM
 *
 * Usage: npx tsx scripts/import-data.ts
 *
 * Reads from documents/ folder:
 *   - Kit export CSV (subscribers with tags)
 *   - Circle export CSV (community members)
 *
 * Logic:
 *   - Creates contacts from Kit (lead_source = kit tag-based)
 *   - Enriches with Circle data (name, location, activity)
 *   - Maps Kit tags to contact_type and funnel_stage
 *   - Creates workshop records + registrations from workshop tags
 *   - Deduplicates by email
 */

import { PrismaClient } from "@prisma/client";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

interface KitRow {
  first_name: string;
  email: string;
  created_at: string;
  status: string;
  tags: string;
  city: string;
  state: string;
  country: string;
}

interface CircleRow {
  "First Name": string;
  "Last Name": string;
  Email: string;
  "Join Date": string;
  "Active (Signed In Last 30 Days)": string;
  Tags: string;
  Location: string;
  "No. of Posts": string;
  "No. of Comments": string;
  "Last Active": string;
  "Member [y/N]": string;
}

function parseCSV<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const rows: T[] = [];
    createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on("data", (row: T) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// Map Kit tags to CRM fields
function mapTagsToContact(tags: string[]): {
  contactType: string;
  funnelStage: string;
  leadSource: string;
  workshopTags: string[];
} {
  const workshopTags = tags.filter(
    (t) => t.includes("Workshop") && t.includes("$"),
  );
  const isCommunityMember = tags.some((t) =>
    t.includes("Paid Member AI Community"),
  );

  if (isCommunityMember) {
    return {
      contactType: "student",
      funnelStage: "community_member",
      leadSource: workshopTags.length > 0 ? "workshop" : "other",
      workshopTags,
    };
  }

  if (workshopTags.length > 0) {
    return {
      contactType: "student",
      funnelStage: "workshop_attendee",
      leadSource: "workshop",
      workshopTags,
    };
  }

  return {
    contactType: "lead",
    funnelStage: "lead",
    leadSource: "tiktok", // Most leads come from TikTok
    workshopTags,
  };
}

// Parse workshop tag into a workshop title and date
function parseWorkshopTag(tag: string): { title: string; date: Date } | null {
  // Tags like "1.4 4/11 Workshop $" or "1.6 $ ARCHIVE Workshop"
  if (tag.includes("ARCHIVE")) {
    return { title: "Archive Workshop Bundle", date: new Date("2026-01-01") };
  }

  const match = tag.match(/(\d+)\/(\d+)\s+Workshop/);
  if (match) {
    const month = parseInt(match[1]);
    const day = parseInt(match[2]);
    const year = 2026;
    const date = new Date(year, month - 1, day, 14, 0, 0); // 2pm default
    const dateStr = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    return {
      title: `Claude Code Vibe Coding Workshop — ${dateStr}`,
      date,
    };
  }

  return null;
}

async function main() {
  const docsDir = path.join(__dirname, "..", "documents");

  console.log("=== Dr. AI CRM Data Import ===\n");

  // Step 1: Read Kit export
  const kitFile = path.join(docsDir, "2026-04-21-6230386.csv");
  console.log("Reading Kit export...");
  const kitRows = await parseCSV<KitRow>(kitFile);
  console.log(`  Found ${kitRows.length} Kit subscribers\n`);

  // Step 2: Read Circle export
  const circleFile = path.join(
    docsDir,
    "community_ai_community_208096_1776759854_audience_list.csv",
  );
  console.log("Reading Circle export...");
  const circleRows = await parseCSV<CircleRow>(circleFile);
  console.log(`  Found ${circleRows.length} Circle members\n`);

  // Step 3: Build Circle lookup by email for enrichment
  const circleByEmail = new Map<string, CircleRow>();
  for (const row of circleRows) {
    if (row.Email) {
      circleByEmail.set(row.Email.toLowerCase().trim(), row);
    }
  }

  // Step 4: Create/ensure workshop records
  console.log("Creating workshop records...");
  const workshopsByTag = new Map<string, string>(); // tag -> workshop ID

  const workshopTags = [
    "1.2 4/25 Workshop $",
    "1.3 4/18 Workshop $",
    "1.4 4/11 Workshop $",
    "1.6 $ ARCHIVE Workshop",
  ];

  for (const tag of workshopTags) {
    const parsed = parseWorkshopTag(tag);
    if (!parsed) continue;

    const existing = await prisma.workshop.findFirst({
      where: { title: parsed.title },
    });

    if (existing) {
      workshopsByTag.set(tag, existing.id);
      console.log(`  Exists: ${parsed.title} (${existing.id})`);
    } else {
      const workshop = await prisma.workshop.create({
        data: {
          title: parsed.title,
          date: parsed.date,
          status: parsed.date < new Date() ? "completed" : "upcoming",
          priceCents: tag.includes("ARCHIVE") ? 12500 : 25000,
        },
      });
      workshopsByTag.set(tag, workshop.id);
      console.log(`  Created: ${parsed.title} (${workshop.id})`);
    }
  }

  // Step 5: Import contacts
  console.log("\nImporting contacts...");
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let registrations = 0;

  for (const row of kitRows) {
    const email = row.email?.toLowerCase().trim();
    if (!email) {
      skipped++;
      continue;
    }

    const tags = row.tags
      ? row.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    const mapped = mapTagsToContact(tags);

    // Check Circle for enrichment
    const circle = circleByEmail.get(email);

    const firstName =
      row.first_name?.trim() || circle?.["First Name"]?.trim() || "";
    const lastName = circle?.["Last Name"]?.trim() || null;

    // Build tags array for the contact
    const contactTags = [...tags];
    if (circle) {
      contactTags.push("circle_member");
      if (circle["Active (Signed In Last 30 Days)"] === "Yes") {
        contactTags.push("circle_active");
      }
    }

    try {
      const existing = await prisma.contact.findUnique({ where: { email } });

      if (existing) {
        // Update with richer data if we have it
        await prisma.contact.update({
          where: { email },
          data: {
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
            contactType:
              mapped.contactType === "lead" && existing.contactType !== "lead"
                ? existing.contactType // Don't downgrade
                : mapped.contactType,
            funnelStage:
              mapped.funnelStage === "lead" && existing.funnelStage !== "lead"
                ? existing.funnelStage // Don't downgrade
                : mapped.funnelStage,
            tags: [...new Set([...existing.tags, ...contactTags])],
            kitSubscriberId: row.email,
          },
        });
        updated++;
      } else {
        await prisma.contact.create({
          data: {
            firstName: firstName || email.split("@")[0],
            lastName,
            email,
            leadSource: mapped.leadSource,
            contactType: mapped.contactType,
            funnelStage: mapped.funnelStage,
            tags: contactTags,
            kitSubscriberId: row.email,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          },
        });
        created++;
      }

      // Create workshop registrations
      for (const wTag of mapped.workshopTags) {
        const workshopId = workshopsByTag.get(wTag);
        if (!workshopId) continue;

        const contact = await prisma.contact.findUnique({ where: { email } });
        if (!contact) continue;

        const existingReg = await prisma.workshopRegistration.findUnique({
          where: {
            workshopId_contactId: {
              workshopId,
              contactId: contact.id,
            },
          },
        });

        if (!existingReg) {
          await prisma.workshopRegistration.create({
            data: {
              workshopId,
              contactId: contact.id,
              paymentStatus: "paid",
              source: "kit_import",
              attended: null, // Unknown from Kit data
            },
          });
          registrations++;
        }
      }
    } catch (err) {
      console.error(`  Error importing ${email}:`, err);
      skipped++;
    }
  }

  // Step 6: Import Circle-only members (not in Kit)
  console.log("\nImporting Circle-only members...");
  let circleOnly = 0;

  for (const row of circleRows) {
    const email = row.Email?.toLowerCase().trim();
    if (!email) continue;

    const existing = await prisma.contact.findUnique({ where: { email } });
    if (existing) continue; // Already imported from Kit

    try {
      await prisma.contact.create({
        data: {
          firstName: row["First Name"]?.trim() || email.split("@")[0],
          lastName: row["Last Name"]?.trim() || null,
          email,
          leadSource: "other",
          contactType: "student",
          funnelStage: "community_member",
          tags: [
            "circle_member",
            row["Active (Signed In Last 30 Days)"] === "Yes"
              ? "circle_active"
              : "circle_inactive",
          ],
          createdAt: row["Join Date"] ? new Date(row["Join Date"]) : new Date(),
        },
      });
      circleOnly++;
    } catch (err) {
      console.error(`  Error importing Circle member ${email}:`, err);
    }
  }

  // Step 7: Create activity log entries
  console.log("\nLogging import activities...");
  const allContacts = await prisma.contact.findMany({
    where: { status: "active" },
    select: { id: true, tags: true },
  });

  for (const contact of allContacts) {
    await prisma.activityLog.create({
      data: {
        contactId: contact.id,
        action: "imported",
        metadata: {
          source: "kit_circle_import",
          date: new Date().toISOString(),
        },
      },
    });
  }

  // Summary
  console.log("\n=== Import Complete ===");
  console.log(`  Contacts created:     ${created}`);
  console.log(`  Contacts updated:     ${updated}`);
  console.log(`  Circle-only members:  ${circleOnly}`);
  console.log(`  Skipped:              ${skipped}`);
  console.log(`  Workshop registrations: ${registrations}`);
  console.log(`  Total contacts:       ${created + updated + circleOnly}`);

  // Stats
  const stats = await prisma.contact.groupBy({
    by: ["contactType"],
    _count: true,
    where: { status: "active" },
  });
  console.log("\n  By type:");
  for (const s of stats) {
    console.log(`    ${s.contactType}: ${s._count}`);
  }

  const funnelStats = await prisma.contact.groupBy({
    by: ["funnelStage"],
    _count: true,
    where: { status: "active" },
  });
  console.log("\n  By funnel stage:");
  for (const s of funnelStats) {
    console.log(`    ${s.funnelStage}: ${s._count}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Import failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
