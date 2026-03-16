// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { verifyStripeSignature } from "./verifySignature.ts";
import { findContactByEmail, createContactFromStripe } from "./contacts.ts";
import {
  handleCheckoutCompleted,
  handleInvoicePaymentSucceeded,
  handleChargeRefunded,
} from "./paymentHandlers.ts";
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from "./subscriptionHandlers.ts";

const STRIPE_WEBHOOK_SECRET_COMMUNITY =
  Deno.env.get("STRIPE_WEBHOOK_SECRET_COMMUNITY") ?? "";
const STRIPE_WEBHOOK_SECRET_CONSULTING =
  Deno.env.get("STRIPE_WEBHOOK_SECRET_CONSULTING") ?? "";

if (!STRIPE_WEBHOOK_SECRET_COMMUNITY && !STRIPE_WEBHOOK_SECRET_CONSULTING) {
  console.warn(
    "Warning: No Stripe webhook secrets configured. Set STRIPE_WEBHOOK_SECRET_COMMUNITY and/or STRIPE_WEBHOOK_SECRET_CONSULTING.",
  );
}

Deno.serve(async (req) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Determine which Stripe account sent the event
  const url = new URL(req.url);
  const account = url.searchParams.get("account") || "community";
  if (account !== "community" && account !== "consulting") {
    return new Response(
      `Invalid account parameter: ${account}. Must be "community" or "consulting".`,
      { status: 400 },
    );
  }

  const webhookSecret =
    account === "consulting"
      ? STRIPE_WEBHOOK_SECRET_CONSULTING
      : STRIPE_WEBHOOK_SECRET_COMMUNITY;

  if (!webhookSecret) {
    return new Response(
      `Webhook secret not configured for account: ${account}`,
      { status: 500 },
    );
  }

  // Read the raw body for signature verification
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Verify the webhook signature
  const isValid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse the event
  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const eventType = event.type as string;
  const eventId = event.id as string;

  console.log(
    `Processing Stripe event: ${eventType} (${eventId}) for account: ${account}`,
  );

  try {
    // Extract customer email from the event data
    const customerEmail = extractCustomerEmail(event);

    // Find or create the CRM contact
    let contactId: number | null = null;
    if (customerEmail) {
      const existingContact = await findContactByEmail(customerEmail);
      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const customerName = extractCustomerName(event);
        const newContact = await createContactFromStripe(
          customerEmail,
          customerName,
        );
        if (newContact) {
          contactId = newContact.id;
        }
      }
    }

    // Route to the appropriate handler
    switch (eventType) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event, contactId, account, supabaseAdmin);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event,
          contactId,
          account,
          supabaseAdmin,
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event,
          contactId,
          account,
          supabaseAdmin,
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event,
          contactId,
          account,
          supabaseAdmin,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event, account, supabaseAdmin);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event, contactId, account, supabaseAdmin);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error processing event ${eventType}:`, error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * Extract customer email from various Stripe event types.
 */
// deno-lint-ignore no-explicit-any
function extractCustomerEmail(event: any): string | null {
  const data = event.data?.object;
  if (!data) return null;

  // checkout.session.completed has customer_details.email
  if (data.customer_details?.email) {
    return data.customer_details.email;
  }

  // invoice.payment_succeeded has customer_email
  if (data.customer_email) {
    return data.customer_email;
  }

  // charge.refunded has billing_details.email or receipt_email
  if (data.billing_details?.email) {
    return data.billing_details.email;
  }
  if (data.receipt_email) {
    return data.receipt_email;
  }

  // Subscriptions may have metadata with email
  if (data.metadata?.email) {
    return data.metadata.email;
  }

  return null;
}

/**
 * Extract customer name from various Stripe event types.
 */
// deno-lint-ignore no-explicit-any
function extractCustomerName(event: any): string | null {
  const data = event.data?.object;
  if (!data) return null;

  if (data.customer_details?.name) {
    return data.customer_details.name;
  }

  if (data.billing_details?.name) {
    return data.billing_details.name;
  }

  return null;
}

/* To invoke locally:
  1. Run `make start`
  2. In another terminal, run `make start-supabase-functions`
  3. In another terminal, make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe_webhook?account=community' \
    --header 'Content-Type: application/json' \
    --header 'stripe-signature: t=1234567890,v1=test_signature' \
    --data '{
      "id": "evt_test_123",
      "type": "checkout.session.completed",
      "data": {
        "object": {
          "id": "cs_test_123",
          "payment_intent": "pi_test_123",
          "customer": "cus_test_123",
          "customer_details": {
            "email": "test@example.com",
            "name": "Test User"
          },
          "amount_total": 9900,
          "currency": "usd",
          "payment_status": "paid",
          "metadata": {}
        }
      }
    }'
*/
