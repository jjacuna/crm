import { useGetList } from "ra-core";
import { startOfMonth, endOfMonth, addDays } from "date-fns";
import { DollarSign, TrendingUp, Users, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Deal, Task } from "../types";

const CLOSED_WON = "closed-won";
const CLOSED_LOST = "closed-lost";

const MetricCard = ({
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

export const MetricsCards = () => {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();
  const sevenDaysOut = addDays(now, 7).toISOString();

  const { data: closedWonMtd } = useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: 1000 },
    filter: {
      stage: CLOSED_WON,
      "created_at@gte": monthStart,
      "created_at@lte": monthEnd,
    },
  });

  const { data: openDeals } = useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: 1000 },
    filter: {
      "stage@neq": CLOSED_WON,
      "stage@neq2": CLOSED_LOST,
    },
  });

  const { data: upcomingTasks } = useGetList<Task>("tasks", {
    pagination: { page: 1, perPage: 5 },
    sort: { field: "due_date", order: "ASC" },
    filter: {
      "due_date@lte": sevenDaysOut,
      "done_date@is": null,
    },
  });

  const revenueMtd = (closedWonMtd ?? []).reduce(
    (sum, d) => sum + (d.amount ?? 0),
    0,
  );

  const pipelineValue = (openDeals ?? []).reduce(
    (sum, d) => sum + (d.amount ?? 0),
    0,
  );

  const openLeadsCount = openDeals?.length ?? 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Revenue MTD"
        value={formatCurrency(revenueMtd)}
        icon={DollarSign}
        description="Closed Won this month"
      />
      <MetricCard
        title="Open Pipeline"
        value={formatCurrency(pipelineValue)}
        icon={TrendingUp}
        description="Total active deal value"
      />
      <MetricCard
        title="Open Leads"
        value={openLeadsCount}
        icon={Users}
        description="Deals not yet closed"
      />
      <MetricCard
        title="Upcoming Tasks"
        value={upcomingTasks?.length ?? 0}
        icon={CalendarCheck}
        description="Due in the next 7 days"
      />
    </div>
  );
};
