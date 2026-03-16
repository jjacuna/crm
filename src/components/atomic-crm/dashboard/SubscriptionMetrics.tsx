import { useMemo } from "react";
import { useGetList } from "ra-core";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Subscription } from "../types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export const SubscriptionMetrics = () => {
  const { data: subscriptions } = useGetList<Subscription>("subscriptions", {
    pagination: { page: 1, perPage: 10000 },
  });

  const metrics = useMemo(() => {
    if (!subscriptions) {
      return {
        activeCount: 0,
        trialCount: 0,
        canceledCount: 0,
        monthlyCount: 0,
        yearlyCount: 0,
        mrr: 0,
        totalActive: 0,
      };
    }

    const active = subscriptions.filter((s) => s.status === "active");
    const trial = subscriptions.filter((s) => s.status === "trial");
    const canceled = subscriptions.filter((s) => s.status === "canceled");
    const monthly = subscriptions.filter(
      (s) =>
        s.billing_interval === "monthly" &&
        (s.status === "active" || s.status === "trial"),
    );
    const yearly = subscriptions.filter(
      (s) =>
        s.billing_interval === "yearly" &&
        (s.status === "active" || s.status === "trial"),
    );

    const mrr = [...active, ...trial].reduce((sum, s) => {
      if (s.billing_interval === "monthly") return sum + s.amount;
      if (s.billing_interval === "yearly") return sum + s.amount / 12;
      return sum;
    }, 0);

    // Canceled in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCanceled = canceled.filter(
      (s) => s.canceled_at && new Date(s.canceled_at) >= thirtyDaysAgo,
    );

    return {
      activeCount: active.length,
      trialCount: trial.length,
      canceledCount: recentCanceled.length,
      monthlyCount: monthly.length,
      yearlyCount: yearly.length,
      mrr,
      totalActive: active.length + trial.length,
    };
  }, [subscriptions]);

  const totalForBar = metrics.activeCount + metrics.trialCount || 1;
  const activePct = (metrics.activeCount / totalForBar) * 100;
  const trialPct = (metrics.trialCount / totalForBar) * 100;

  const billingTotal = metrics.monthlyCount + metrics.yearlyCount || 1;
  const monthlyPct = (metrics.monthlyCount / billingTotal) * 100;
  const yearlyPct = (metrics.yearlyCount / billingTotal) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="size-5 text-muted-foreground" />
          <CardTitle>Subscription Metrics</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active subscriptions and MRR */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{metrics.totalActive}</p>
            <p className="text-xs text-muted-foreground">
              Active subscriptions
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</p>
            <p className="text-xs text-muted-foreground">MRR</p>
          </div>
        </div>

        {/* Trial vs Active bar */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Trial vs Active
          </p>
          <div className="h-5 bg-muted rounded overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${activePct}%` }}
              title={`Active: ${metrics.activeCount}`}
            />
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${trialPct}%` }}
              title={`Trial: ${metrics.trialCount}`}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded bg-primary" />
              <span>Active ({metrics.activeCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded bg-amber-400" />
              <span>Trial ({metrics.trialCount})</span>
            </div>
          </div>
        </div>

        {/* Monthly vs Yearly */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Monthly vs Yearly
          </p>
          <div className="h-5 bg-muted rounded overflow-hidden flex">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${monthlyPct}%` }}
              title={`Monthly: ${metrics.monthlyCount}`}
            />
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${yearlyPct}%` }}
              title={`Yearly: ${metrics.yearlyCount}`}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded bg-blue-500" />
              <span>Monthly ({metrics.monthlyCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded bg-violet-500" />
              <span>Yearly ({metrics.yearlyCount})</span>
            </div>
          </div>
        </div>

        {/* Churn */}
        {metrics.canceledCount > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="destructive">{metrics.canceledCount}</Badge>
            <span className="text-sm text-muted-foreground">
              canceled in the last 30 days
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
