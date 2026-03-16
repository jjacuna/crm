import { useState, useMemo } from "react";
import { useGetList } from "ra-core";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Payment } from "../types";

const PERIOD_OPTIONS = [7, 14, 30, 60, 90] as const;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const getWeekLabel = (date: Date): string => {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
};

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const RevenueChart = () => {
  const [period, setPeriod] = useState<number>(30);

  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d.toISOString();
  }, [period]);

  const { data: payments } = useGetList<Payment>("payments", {
    pagination: { page: 1, perPage: 10000 },
    sort: { field: "payment_date", order: "ASC" },
    filter: {
      "payment_date@gte": cutoffDate,
    },
  });

  const weeklyData = useMemo(() => {
    if (!payments || payments.length === 0) return [];

    const weeks: Record<
      string,
      { label: string; oneTime: number; subscription: number; weekStart: Date }
    > = {};

    for (const payment of payments) {
      const paymentDate = new Date(payment.payment_date);
      const weekStart = getWeekStart(paymentDate);
      const key = weekStart.toISOString();

      if (!weeks[key]) {
        weeks[key] = {
          label: getWeekLabel(weekStart),
          oneTime: 0,
          subscription: 0,
          weekStart,
        };
      }

      if (payment.payment_type === "subscription") {
        weeks[key].subscription += payment.amount;
      } else {
        weeks[key].oneTime += payment.amount;
      }
    }

    return Object.values(weeks).sort(
      (a, b) => a.weekStart.getTime() - b.weekStart.getTime(),
    );
  }, [payments]);

  const maxRevenue = useMemo(() => {
    if (weeklyData.length === 0) return 1;
    return Math.max(...weeklyData.map((w) => w.oneTime + w.subscription));
  }, [weeklyData]);

  // Week-over-week comparison
  const currentWeekTotal =
    weeklyData.length > 0
      ? weeklyData[weeklyData.length - 1].oneTime +
        weeklyData[weeklyData.length - 1].subscription
      : 0;
  const previousWeekTotal =
    weeklyData.length > 1
      ? weeklyData[weeklyData.length - 2].oneTime +
        weeklyData[weeklyData.length - 2].subscription
      : 0;
  const weekOverWeekChange =
    previousWeekTotal > 0
      ? (
          ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) *
          100
        ).toFixed(1)
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="size-5 text-muted-foreground" />
            <CardTitle>Revenue Over Time</CardTitle>
          </div>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p}d
              </Button>
            ))}
          </div>
        </div>
        {weekOverWeekChange !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            Week-over-week:{" "}
            <span
              className={
                Number(weekOverWeekChange) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {Number(weekOverWeekChange) >= 0 ? "+" : ""}
              {weekOverWeekChange}%
            </span>{" "}
            ({formatCurrency(currentWeekTotal)} vs{" "}
            {formatCurrency(previousWeekTotal)})
          </p>
        )}
      </CardHeader>
      <CardContent>
        {weeklyData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No revenue data for this period.
          </p>
        ) : (
          <div className="space-y-3">
            {weeklyData.map((week) => {
              const total = week.oneTime + week.subscription;
              const totalPct = (total / maxRevenue) * 100;
              const subPct = (week.subscription / maxRevenue) * 100;

              return (
                <div key={week.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground w-16">
                      {week.label}
                    </span>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                  <div className="h-5 bg-muted rounded overflow-hidden relative">
                    <div
                      className="h-full bg-blue-400 absolute left-0 top-0 rounded-l transition-all"
                      style={{ width: `${subPct}%` }}
                      title={`Subscription: ${formatCurrency(week.subscription)}`}
                    />
                    <div
                      className="h-full bg-primary absolute left-0 top-0 rounded transition-all"
                      style={{
                        width: `${totalPct}%`,
                        clipPath: `inset(0 0 0 ${subPct > 0 ? (subPct / totalPct) * 100 : 0}%)`,
                      }}
                      title={`One-time: ${formatCurrency(week.oneTime)}`}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded bg-blue-400" />
                <span>Subscription</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded bg-primary" />
                <span>One-time</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
