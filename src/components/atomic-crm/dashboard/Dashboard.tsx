import { useGetList } from "ra-core";

import type { Contact, ContactNote } from "../types";
import { DashboardStepper } from "./DashboardStepper";
import { KPICards } from "./KPICards";
import { RevenueChart } from "./RevenueChart";
import { FunnelBreakdown } from "./FunnelBreakdown";
import { LeadSourceChart } from "./LeadSourceChart";
import { SubscriptionMetrics } from "./SubscriptionMetrics";
import { RecentActivity } from "./RecentActivity";

export const Dashboard = () => {
  const {
    data: dataContact,
    total: totalContact,
    isPending: isPendingContact,
  } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1 },
  });

  const { total: totalContactNotes, isPending: isPendingContactNotes } =
    useGetList<ContactNote>("contact_notes", {
      pagination: { page: 1, perPage: 1 },
    });

  const isPending = isPendingContact || isPendingContactNotes;

  if (isPending) {
    return null;
  }

  if (!totalContact) {
    return <DashboardStepper step={1} />;
  }

  if (!totalContactNotes) {
    return <DashboardStepper step={2} contactId={dataContact?.[0]?.id} />;
  }

  return (
    <div className="mt-1 space-y-6">
      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <SubscriptionMetrics />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelBreakdown />
        <LeadSourceChart />
      </div>

      <RecentActivity />
    </div>
  );
};
