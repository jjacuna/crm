import type {
  Company,
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Payment,
  Sale,
  Subscription,
  Tag,
  Task,
} from "../../../types";
import type { ConfigurationContextValue } from "../../../root/ConfigurationContext";

export interface Db {
  companies: Required<Company>[];
  contacts: Required<Contact>[];
  contact_notes: ContactNote[];
  deals: Deal[];
  deal_notes: DealNote[];
  payments: Payment[];
  sales: Sale[];
  subscriptions: Subscription[];
  tags: Tag[];
  tasks: Task[];
  configuration: Array<{ id: number; config: ConfigurationContextValue }>;
}
