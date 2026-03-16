import { generateCompanies } from "./companies";
import { generateContactNotes } from "./contactNotes";
import { generateDealNotes } from "./dealNotes";
import { generateDeals } from "./deals";
import { finalize } from "./finalize";
import { realContacts } from "./realContacts";
import { realPayments } from "./realPayments";
import { realSubscriptions } from "./realSubscriptions";
import { generateSales } from "./sales";
import { generateTags } from "./tags";
import { generateTasks } from "./tasks";
import type { Db } from "./types";

export default (): Db => {
  const db = {} as Db;
  db.sales = generateSales(db);
  db.tags = generateTags(db);
  db.companies = generateCompanies(db);
  // Use real contacts from Kit CSV data
  db.contacts = realContacts as Db["contacts"];
  db.contact_notes = generateContactNotes(db);
  db.deals = generateDeals(db);
  db.deal_notes = generateDealNotes(db);
  db.tasks = generateTasks(db);
  // Use real payments and subscriptions from Circle CSV data
  db.payments = realPayments;
  db.subscriptions = realSubscriptions;
  db.configuration = [
    {
      id: 1,
      config: {} as Db["configuration"][number]["config"],
    },
  ];
  finalize(db);

  return db;
};
