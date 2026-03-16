import { useRecordContext } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Badge } from "@/components/ui/badge";

import { TopToolbar } from "../layout/TopToolbar";

const paymentTypeLabels: Record<string, string> = {
  one_time: "One-time",
  subscription: "Subscription",
  refund: "Refund",
};

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  succeeded: "default",
  pending: "outline",
  failed: "destructive",
  refunded: "secondary",
  canceled: "secondary",
};

const AmountField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  const isRefund = record.payment_type === "refund";
  return (
    <span className={isRefund ? "text-destructive" : ""}>
      {isRefund ? "-" : ""}
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: record.currency || "usd",
      }).format(record.amount)}
    </span>
  );
};

const PaymentTypeField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <span>{paymentTypeLabels[record.payment_type] ?? record.payment_type}</span>
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

const PaymentDateField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <span>
      {new Date(record.payment_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
    </span>
  );
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

const PaymentListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const PaymentList = () => (
  <List
    title="Payments"
    actions={<PaymentListActions />}
    sort={{ field: "payment_date", order: "DESC" }}
  >
    <DataTable rowClick="show">
      <DataTable.Col source="payment_date" label="Date">
        <PaymentDateField />
      </DataTable.Col>
      <DataTable.Col source="contact_id" label="Contact">
        <ReferenceField source="contact_id" reference="contacts">
          <TextField source="first_name" /> <TextField source="last_name" />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col source="amount" label="Amount">
        <AmountField />
      </DataTable.Col>
      <DataTable.Col source="payment_type" label="Type">
        <PaymentTypeField />
      </DataTable.Col>
      <DataTable.Col source="status" label="Status">
        <StatusField />
      </DataTable.Col>
      <DataTable.Col source="stripe_account" label="Account">
        <StripeAccountField />
      </DataTable.Col>
      <DataTable.Col source="description" />
    </DataTable>
  </List>
);
