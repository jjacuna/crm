import { useMemo } from "react";
import { useGetList } from "ra-core";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Contact } from "../types";

const LEAD_SOURCES = [
  { value: "tiktok", label: "TikTok LIVE" },
  { value: "workshop", label: "Workshop" },
  { value: "youtube", label: "YouTube" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "other", label: "Other" },
] as const;

const SOURCE_COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-slate-500",
  "bg-gray-400",
];

export const LeadSourceChart = () => {
  const { data: contacts } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 10000 },
  });

  const sourceData = useMemo(() => {
    if (!contacts) return [];

    const sourceCounts: Record<string, { total: number; converted: number }> =
      {};

    for (const contact of contacts) {
      const source = contact.lead_source ?? "other";
      if (!sourceCounts[source]) {
        sourceCounts[source] = { total: 0, converted: 0 };
      }
      sourceCounts[source].total++;
      if (contact.contact_type && contact.contact_type !== "lead") {
        sourceCounts[source].converted++;
      }
    }

    const maxCount = Math.max(
      ...Object.values(sourceCounts).map((s) => s.total),
      1,
    );

    return LEAD_SOURCES.map((source, index) => {
      const data = sourceCounts[source.value] ?? { total: 0, converted: 0 };
      const conversionRate =
        data.total > 0 ? ((data.converted / data.total) * 100).toFixed(1) : "0";
      return {
        ...source,
        total: data.total,
        converted: data.converted,
        conversionRate,
        percentage: (data.total / maxCount) * 100,
        color: SOURCE_COLORS[index],
      };
    }).sort((a, b) => b.total - a.total);
  }, [contacts]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-muted-foreground" />
          <CardTitle>Lead Source Attribution</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sourceData.map((source) => (
            <div key={source.value} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-28 text-sm font-medium truncate">
                  {source.label}
                </span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className={`h-full ${source.color} rounded transition-all`}
                    style={{ width: `${Math.max(source.percentage, 2)}%` }}
                  />
                </div>
                <span className="w-10 text-sm text-right tabular-nums">
                  {source.total}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-28 ml-2">
                <span className="text-xs text-muted-foreground">
                  {source.conversionRate}% conversion ({source.converted}{" "}
                  converted)
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
