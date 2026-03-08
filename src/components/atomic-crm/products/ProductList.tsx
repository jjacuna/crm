import { useRecordContext } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { Badge } from "@/components/ui/badge";

import { TopToolbar } from "../layout/TopToolbar";

const categoryLabels: Record<string, string> = {
  workshop: "Saturday Workshop",
  academy: "AI Empire Academy",
  certification: "AI Systems Architect Certification",
  corporate: "Corporate Consulting",
};

const CategoryField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  return <span>{categoryLabels[record.category] ?? record.category}</span>;
};

const PriceField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <span>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(record.price)}
    </span>
  );
};

const StatusField = (_props: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Badge variant={record.is_active ? "default" : "secondary"}>
      {record.is_active ? "Active" : "Inactive"}
    </Badge>
  );
};

const ProductListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const ProductList = () => (
  <List
    title="Products"
    actions={<ProductListActions />}
    sort={{ field: "name", order: "ASC" }}
  >
    <DataTable rowClick="edit">
      <DataTable.Col source="name" />
      <DataTable.Col source="category" label="Category">
        <CategoryField />
      </DataTable.Col>
      <DataTable.Col source="price" label="Price">
        <PriceField />
      </DataTable.Col>
      <DataTable.Col source="is_active" label="Status">
        <StatusField />
      </DataTable.Col>
    </DataTable>
  </List>
);
