import { random } from "faker/locale/en_US";

import type { Subscription } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

export const generateSubscriptions = (db: Db): Subscription[] => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return Array.from(Array(80).keys()).map((id) => {
    const contact = random.arrayElement(db.contacts);
    const status = random.arrayElement([
      "active",
      "active",
      "active",
      "active",
      "trial",
      "trial",
      "canceled",
      "past_due",
    ]) as "trial" | "active" | "canceled" | "past_due";
    const billing_interval = random.arrayElement([
      "monthly",
      "monthly",
      "monthly",
      "yearly",
    ]) as "monthly" | "yearly";
    const amount =
      billing_interval === "monthly"
        ? random.arrayElement([29, 49, 97, 197])
        : random.arrayElement([290, 490, 970, 1970]);

    const start_date = randomDate(sixMonthsAgo, new Date()).toISOString();
    const canceled_at =
      status === "canceled"
        ? randomDate(new Date(start_date), new Date()).toISOString()
        : null;

    return {
      id,
      contact_id: contact.id,
      plan_name: random.arrayElement([
        "AI Foundations",
        "AI Pro",
        "AI Consultant",
        "Coaching Program",
      ]),
      status,
      billing_interval,
      amount,
      start_date,
      end_date: canceled_at,
      canceled_at,
      created_at: start_date,
    };
  });
};
