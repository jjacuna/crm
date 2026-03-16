import { add } from "date-fns";
import { datatype, random } from "faker/locale/en_US";

import type { Subscription } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

const intervals = ["monthly", "yearly"] as const;
const statuses = ["active", "trial", "past_due", "canceled", "ended"] as const;
const stripeAccounts = ["community", "consulting"] as const;

const planNames = [
  "Community Membership - Monthly",
  "Community Membership - Annual",
  "AI Empire Academy",
  "Coaching Package - Monthly",
];

const planAmounts: Record<string, number> = {
  "Community Membership - Monthly": 97,
  "Community Membership - Annual": 970,
  "AI Empire Academy": 297,
  "Coaching Package - Monthly": 500,
};

export const generateSubscriptions = (db: Db): Subscription[] => {
  return Array.from(Array(30).keys()).map((id) => {
    const contact = random.arrayElement(db.contacts);
    const planName = random.arrayElement(planNames);
    const interval = planName.includes("Annual") ? "yearly" : "monthly";
    const status = random.arrayElement([...statuses]);
    const startDate = randomDate(new Date("2025-01-01"), new Date());
    const periodEnd = add(
      startDate,
      interval === "monthly" ? { months: 1 } : { years: 1 },
    );

    return {
      id,
      contact_id: contact.id,
      stripe_subscription_id: `sub_${datatype.uuid().replace(/-/g, "").slice(0, 24)}`,
      stripe_account: random.arrayElement([...stripeAccounts]),
      product_id: undefined,
      plan_name: planName,
      amount: planAmounts[planName] ?? 97,
      currency: "usd",
      interval,
      status,
      start_date: startDate.toISOString(),
      current_period_end: periodEnd.toISOString(),
      canceled_at:
        status === "canceled"
          ? randomDate(startDate, new Date()).toISOString()
          : undefined,
      sales_id: contact.sales_id,
      created_at: startDate.toISOString(),
    };
  });
};
