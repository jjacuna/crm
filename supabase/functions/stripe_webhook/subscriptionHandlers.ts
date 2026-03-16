/**
 * Stripe subscription event handlers.
 *
 * Handles: customer.subscription.created, customer.subscription.updated,
 *          customer.subscription.deleted
 */
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * Map Stripe subscription status to our allowed statuses.
 */
function mapSubscriptionStatus(stripeStatus: string): string {
  const validStatuses = [
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "trialing",
    "incomplete",
    "incomplete_expired",
    "paused",
  ];
  return validStatuses.includes(stripeStatus) ? stripeStatus : "active";
}

/**
 * Handle customer.subscription.created events.
 * Creates a new subscription record in the CRM.
 */
export async function handleSubscriptionCreated(
  // deno-lint-ignore no-explicit-any
  event: any,
  contactId: number | null,
  account: string,
  supabase: SupabaseClient,
): Promise<void> {
  const subscription = event.data.object;

  // Check if subscription already exists (idempotency)
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    console.log(
      `Subscription ${subscription.id} already exists, skipping creation`,
    );
    return;
  }

  // Extract price and product from the first item
  const firstItem = subscription.items?.data?.[0];
  const priceId = firstItem?.price?.id || null;
  const productId = firstItem?.price?.product || null;

  const { error } = await supabase.from("subscriptions").insert({
    contact_id: contactId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer || null,
    status: mapSubscriptionStatus(subscription.status),
    stripe_price_id: priceId,
    stripe_product_id: productId,
    current_period_start: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    stripe_account: account,
    stripe_customer_email: subscription.metadata?.email || null,
    metadata: subscription.metadata || null,
  });

  if (error) {
    console.error("Error creating subscription record:", error);
    throw error;
  }

  console.log(
    `Created subscription record: ${subscription.id} (${subscription.status})`,
  );
}

/**
 * Handle customer.subscription.updated events.
 * Updates the subscription status and period dates.
 */
export async function handleSubscriptionUpdated(
  // deno-lint-ignore no-explicit-any
  event: any,
  contactId: number | null,
  account: string,
  supabase: SupabaseClient,
): Promise<void> {
  const subscription = event.data.object;

  // Extract price and product from the first item
  const firstItem = subscription.items?.data?.[0];
  const priceId = firstItem?.price?.id || null;
  const productId = firstItem?.price?.product || null;

  // Try to update existing subscription first
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        contact_id: contactId ?? undefined,
        status: mapSubscriptionStatus(subscription.status),
        stripe_price_id: priceId,
        stripe_product_id: productId,
        current_period_start: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error updating subscription record:", error);
      throw error;
    }

    console.log(
      `Updated subscription: ${subscription.id} -> ${subscription.status}`,
    );
  } else {
    // If subscription doesn't exist yet, create it (out-of-order events)
    await handleSubscriptionCreated(event, contactId, account, supabase);
  }
}

/**
 * Handle customer.subscription.deleted events.
 * Marks the subscription as canceled.
 */
export async function handleSubscriptionDeleted(
  // deno-lint-ignore no-explicit-any
  event: any,
  account: string,
  supabase: SupabaseClient,
): Promise<void> {
  const subscription = event.data.object;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error marking subscription as canceled:", error);
      throw error;
    }

    console.log(`Canceled subscription: ${subscription.id}`);
  } else {
    // Create a canceled record if we missed the creation event
    console.log(
      `Subscription ${subscription.id} not found, creating canceled record`,
    );

    const firstItem = subscription.items?.data?.[0];
    const { error } = await supabase.from("subscriptions").insert({
      contact_id: null,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer || null,
      status: "canceled",
      stripe_price_id: firstItem?.price?.id || null,
      stripe_product_id: firstItem?.price?.product || null,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      stripe_account: account,
      metadata: subscription.metadata || null,
    });

    if (error) {
      console.error("Error creating canceled subscription record:", error);
      throw error;
    }
  }
}
