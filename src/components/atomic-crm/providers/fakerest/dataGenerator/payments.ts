import { datatype, lorem, random } from "faker/locale/en_US";

import type { Payment } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

export const generatePayments = (db: Db): Payment[] => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return Array.from(Array(200).keys()).map((id) => {
    const contact = random.arrayElement(db.contacts);
    const payment_type = random.arrayElement([
      "one_time",
      "one_time",
      "subscription",
      "subscription",
      "subscription",
    ]) as "one_time" | "subscription";
    const amount =
      payment_type === "subscription"
        ? random.arrayElement([29, 49, 97, 197, 297])
        : random.arrayElement([97, 197, 497, 997, 1997, 2997]);

    const payment_date = randomDate(ninetyDaysAgo, new Date()).toISOString();

    return {
      id,
      contact_id: contact.id,
      amount,
      payment_date,
      payment_type,
      description: lorem.words(3),
      created_at: payment_date,
    };
  });
};
