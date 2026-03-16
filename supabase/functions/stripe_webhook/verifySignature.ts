/**
 * Verify Stripe webhook signature using Web Crypto API (Deno-native).
 *
 * Stripe signs webhooks with HMAC-SHA256. The signature header format is:
 *   t=<timestamp>,v1=<signature>[,v0=<legacy_signature>]
 *
 * The signed payload is: `${timestamp}.${body}`
 */
export async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    // Parse the signature header
    const parts = signature.split(",").reduce(
      (acc, part) => {
        const [key, value] = part.split("=", 2);
        if (key && value) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    const timestamp = parts["t"];
    const expectedSig = parts["v1"];

    if (!timestamp || !expectedSig) {
      console.error(
        "Missing timestamp or v1 signature in stripe-signature header",
      );
      return false;
    }

    // Reject events with timestamps older than 5 minutes (tolerance for clock drift)
    const timestampAge =
      Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (isNaN(timestampAge) || timestampAge > 300) {
      console.error(`Webhook timestamp too old: ${timestampAge}s`);
      return false;
    }

    // Compute the expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload),
    );

    const computedSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison to prevent timing attacks
    if (computedSig.length !== expectedSig.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < computedSig.length; i++) {
      result |= computedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error("Error verifying Stripe signature:", error);
    return false;
  }
}
