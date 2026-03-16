import { datatype, random } from "faker/locale/en_US";

import type { Payment } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

const paymentTypes = ["one_time", "subscription", "refund"] as const;
const statuses = [
  "succeeded",
  "pending",
  "failed",
  "refunded",
  "canceled",
] as const;
const stripeAccounts = ["community", "consulting"] as const;

const descriptions = [
  "Community Membership",
  "Saturday Workshop",
  "AI Consultant Certification",
  "Coaching Package",
  "Workshop Ticket",
  "Annual Membership",
  "Monthly Membership",
];

export const generatePayments = (db: Db): Payment[] => {
  return Array.from(Array(80).keys()).map((id) => {
    const contact = random.arrayElement(db.contacts);
    const paymentType = random.arrayElement([...paymentTypes]);
    const status =
      paymentType === "refund"
        ? "succeeded"
        : random.arrayElement([...statuses]);
    const amount =
      paymentType === "refund"
        ? -datatype.number({ min: 50, max: 500 })
        : datatype.number({ min: 50, max: 2000 });

    return {
      id,
      contact_id: contact.id,
      amount: Math.abs(amount),
      currency: "usd",
      payment_type: paymentType,
      status,
      description: random.arrayElement(descriptions),
      stripe_payment_id: `pi_${datatype.uuid().replace(/-/g, "").slice(0, 24)}`,
      stripe_subscription_id:
        paymentType === "subscription"
          ? `sub_${datatype.uuid().replace(/-/g, "").slice(0, 24)}`
          : undefined,
      stripe_account: random.arrayElement([...stripeAccounts]),
      product_id: undefined,
      payment_date: randomDate(
        new Date("2025-01-01"),
        new Date(),
      ).toISOString(),
      sales_id: contact.sales_id,
      created_at: new Date().toISOString(),
    };
  });
};
