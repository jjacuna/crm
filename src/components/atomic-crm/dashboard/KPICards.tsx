import { useGetList } from "ra-core";
import { Users, DollarSign, UserCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Contact, Subscription } from "../types";

const KPICard = ({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="size-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export const KPICards = () => {
  const { data: contacts } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 10000 },
  });

  const { data: subscriptions } = useGetList<Subscription>("subscriptions", {
    pagination: { page: 1, perPage: 10000 },
  });

  const allContacts = contacts ?? [];
  const allSubscriptions = subscriptions ?? [];

  const totalLeads = allContacts.filter(
    (c) => c.contact_type === "lead",
  ).length;
  const totalCustomers = allContacts.filter(
    (c) => c.contact_type && c.contact_type !== "lead",
  ).length;
  const conversionRate =
    allContacts.length > 0
      ? ((totalCustomers / allContacts.length) * 100).toFixed(1)
      : "0";

  const activeSubscriptions = allSubscriptions.filter(
    (s) => s.status === "active" || s.status === "trial",
  );
  const mrr = activeSubscriptions.reduce((sum, s) => {
    if (s.billing_interval === "monthly") return sum + s.amount;
    if (s.billing_interval === "yearly") return sum + s.amount / 12;
    return sum;
  }, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        title="Total Leads"
        value={totalLeads}
        icon={Users}
        description="Contacts with lead status"
      />
      <KPICard
        title="MRR"
        value={formatCurrency(mrr)}
        icon={DollarSign}
        description="Monthly Recurring Revenue"
      />
      <KPICard
        title="Total Customers"
        value={totalCustomers}
        icon={UserCheck}
        description="Non-lead contacts"
      />
      <KPICard
        title="Conversion Rate"
        value={`${conversionRate}%`}
        icon={TrendingUp}
        description="Customers / Total contacts"
      />
    </div>
  );
};
