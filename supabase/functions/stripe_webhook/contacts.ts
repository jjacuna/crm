/**
 * Contact lookup and creation helpers for Stripe webhook processing.
 *
 * Uses the same pattern as the postmark edge function for finding
 * contacts by email_jsonb and creating new contacts.
 */
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

/**
 * Find a CRM contact by email address.
 * Queries the contacts table where email_jsonb contains the email.
 */
export async function findContactByEmail(
  email: string,
  // deno-lint-ignore no-explicit-any
): Promise<{ id: number; contact_type: string | null } | null> {
  const { data: contact, error } = await supabaseAdmin
    .from("contacts")
    .select("id, contact_type")
    .contains("email_jsonb", JSON.stringify([{ email }]))
    .maybeSingle();

  if (error) {
    console.error(`Error finding contact by email ${email}:`, error);
    return null;
  }

  return contact;
}

/**
 * Create a new CRM contact from Stripe customer data.
 * Splits the name into first/last and sets initial contact_type to "lead".
 */
export async function createContactFromStripe(
  email: string,
  name: string | null,
  // deno-lint-ignore no-explicit-any
): Promise<{ id: number } | null> {
  let firstName = "";
  let lastName = "";

  if (name) {
    const parts = name.trim().split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ") || "";
  }

  const { data: newContact, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      first_name: firstName || email.split("@")[0],
      last_name: lastName,
      email_jsonb: [{ email, type: "Work" }],
      contact_type: "lead",
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      tags: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error(`Error creating contact for ${email}:`, error);
    return null;
  }

  console.log(`Created new contact ${newContact.id} for email: ${email}`);
  return newContact;
}

/**
 * Update a contact's contact_type to reflect their payment status.
 * Only upgrades (lead -> student -> client), never downgrades.
 */
export async function upgradeContactType(
  contactId: number,
  newType: string,
): Promise<void> {
  const typeHierarchy: Record<string, number> = {
    lead: 0,
    student: 1,
    client: 2,
    corporate: 3,
    alumni: 4,
  };

  // Get current contact type
  const { data: contact, error: fetchError } = await supabaseAdmin
    .from("contacts")
    .select("contact_type")
    .eq("id", contactId)
    .single();

  if (fetchError || !contact) {
    console.error(`Error fetching contact ${contactId}:`, fetchError);
    return;
  }

  const currentRank = typeHierarchy[contact.contact_type ?? ""] ?? -1;
  const newRank = typeHierarchy[newType] ?? -1;

  // Only upgrade, never downgrade
  if (newRank > currentRank) {
    const { error: updateError } = await supabaseAdmin
      .from("contacts")
      .update({
        contact_type: newType,
        last_seen: new Date().toISOString(),
      })
      .eq("id", contactId);

    if (updateError) {
      console.error(
        `Error upgrading contact ${contactId} to ${newType}:`,
        updateError,
      );
    } else {
      console.log(
        `Upgraded contact ${contactId} from ${contact.contact_type} to ${newType}`,
      );
    }
  }
}
