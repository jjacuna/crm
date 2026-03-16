/**
 * Stripe payment event handlers.
 *
 * Handles: checkout.session.completed, invoice.payment_succeeded, charge.refunded
 */
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { upgradeContactType } from "./contacts.ts";

/**
 * Handle checkout.session.completed events.
 * Creates a payment record and upgrades the contact's type.
 */
export async function handleCheckoutCompleted(
  // deno-lint-ignore no-explicit-any
  event: any,
  contactId: number | null,
  account: string,
  supabase: SupabaseClient,
): Promise<void> {
  const session = event.data.object;

  const paymentId = session.payment_intent || session.id || `cs_${event.id}`;
  const amount = (session.amount_total ?? 0) / 100; // Stripe amounts are in cents
  const currency = session.currency || "usd";

  // Check for duplicate event processing
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  const { error } = await supabase.from("payments").insert({
    contact_id: contactId,
    stripe_payment_id: paymentId,
    stripe_customer_id: session.customer || null,
    stripe_invoice_id: session.invoice || null,
    stripe_subscription_id: session.subscription || null,
    amount,
    currency,
    status: session.payment_status === "paid" ? "succeeded" : "pending",
    type: session.subscription ? "subscription" : "one_time",
    description:
      session.metadata?.description || `Checkout session ${session.id}`,
    stripe_account: account,
    stripe_customer_email: session.customer_details?.email || null,
    stripe_event_id: event.id,
    metadata: session.metadata || null,
  });

  if (error) {
    console.error("Error creating payment record:", error);
    throw error;
  }

  console.log(`Created payment record for checkout session: ${session.id}`);

  // Upgrade contact type based on the purchase
  if (contactId && session.payment_status === "paid") {
    const contactType = account === "consulting" ? "client" : "student";
    await upgradeContactType(contactId, contactType);
  }
}

/**
 * Handle invoice.payment_succeeded events.
 * Creates a payment record for subscription renewals.
 */
export async function handleInvoicePaymentSucceeded(
  // deno-lint-ignore no-explicit-any
  event: any,
  contactId: number | null,
  account: string,
  supabase: SupabaseClient,
): Promise<void> {
  const invoice = event.data.object;

  // Use the payment_intent as the unique payment ID, fall back to invoice ID
  const paymentId = invoice.payment_intent || `inv_${invoice.id}`;

  // Check for duplicate event processing
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  const amount = (invoice.amount_paid ?? 0) / 100;
  const currency = invoice.currency || "usd";

  const { error } = await supabase.from("payments").insert({
    contact_id: contactId,
    stripe_payment_id: paymentId,
    stripe_customer_id: invoice.customer || null,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: invoice.subscription || null,
    amount,
    currency,
    status: "succeeded",
    type: invoice.subscription ? "subscription" : "one_time",
    description:
      invoice.description ||
      invoice.lines?.data?.[0]?.description ||
      `Invoice ${invoice.id}`,
    stripe_account: account,
    stripe_customer_email: invoice.customer_email || null,
    stripe_event_id: event.id,
    metadata: invoice.metadata || null,
  });

  if (error) {
    console.error("Error creating payment record from invoice:", error);
    throw error;
  }

  console.log(`Created payment record for invoice: ${invoice.id}`);
}

/**
 * Handle charge.refunded events.
 * Creates a refund payment record with negative amount.
 */
export async function handleChargeRefunded(
  // deno-lint-ignore no-explicit-any
  event: any,
  contactId: number | null,
  account: string,
  supabase: SupabaseClient,
): Promise<void> {
  const charge = event.data.object;

  // Check for duplicate event processing
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  const amountRefunded = (charge.amount_refunded ?? 0) / 100;
  const currency = charge.currency || "usd";

  const { error } = await supabase.from("payments").insert({
    contact_id: contactId,
    stripe_payment_id: `refund_${charge.id}_${event.id}`,
    stripe_customer_id: charge.customer || null,
    stripe_invoice_id: charge.invoice || null,
    amount: -amountRefunded, // Negative amount for refunds
    currency,
    status: "refunded",
    type: "refund",
    description: `Refund for charge ${charge.id}`,
    stripe_account: account,
    stripe_customer_email:
      charge.billing_details?.email || charge.receipt_email || null,
    stripe_event_id: event.id,
    metadata: charge.metadata || null,
  });

  if (error) {
    console.error("Error creating refund record:", error);
    throw error;
  }

  console.log(
    `Created refund record for charge: ${charge.id} (${amountRefunded} ${currency})`,
  );
}
