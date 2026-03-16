import { useGetList } from "ra-core";
import { UserPlus, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Contact, Payment } from "../types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const RecentActivity = () => {
  const { data: recentLeads } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "first_seen", order: "DESC" },
    filter: { contact_type: "lead" },
  });

  const { data: recentPayments } = useGetList<Payment>("payments", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "payment_date", order: "DESC" },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Recent Leads</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!recentLeads || recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent leads.</p>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between py-1.5 border-b border-muted last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {contact.first_name} {contact.last_name}
                    </p>
                    {contact.lead_source && (
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        {contact.lead_source}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {formatDate(contact.first_seen)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!recentPayments || recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent payments.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-1.5 border-b border-muted last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {formatCurrency(payment.amount)}
                    </p>
                    <Badge
                      variant={
                        payment.payment_type === "subscription"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs mt-0.5"
                    >
                      {payment.payment_type === "subscription"
                        ? "Subscription"
                        : "One-time"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {formatDate(payment.payment_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
