import { useRecordContext } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Badge } from "@/components/ui/badge";

import { TopToolbar } from "../layout/TopToolbar";

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  trial: "outline",
  past_due: "destructive",
  canceled: "secondary",
  ended: "secondary",
};

const AmountField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <span>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: record.currency || "usd",
      }).format(record.amount)}
      /{record.interval === "monthly" ? "mo" : "yr"}
    </span>
  );
};

const StatusField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Badge variant={statusColors[record.status] ?? "secondary"}>
      {record.status}
    </Badge>
  );
};

const IntervalField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  return <span className="capitalize">{record.interval}</span>;
};

const StripeAccountField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record?.stripe_account) return null;
  return (
    <Badge variant="outline">
      {record.stripe_account === "community" ? "Community" : "Consulting"}
    </Badge>
  );
};

const SubscriptionListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const SubscriptionList = () => (
  <List
    title="Subscriptions"
    actions={<SubscriptionListActions />}
    sort={{ field: "created_at", order: "DESC" }}
  >
    <DataTable rowClick="show">
      <DataTable.Col source="plan_name" label="Plan" />
      <DataTable.Col source="contact_id" label="Contact">
        <ReferenceField source="contact_id" reference="contacts">
          <TextField source="first_name" /> <TextField source="last_name" />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col source="amount" label="Amount">
        <AmountField />
      </DataTable.Col>
      <DataTable.Col source="interval" label="Interval">
        <IntervalField />
      </DataTable.Col>
      <DataTable.Col source="status" label="Status">
        <StatusField />
      </DataTable.Col>
      <DataTable.Col source="stripe_account" label="Account">
        <StripeAccountField />
      </DataTable.Col>
    </DataTable>
  </List>
);
