import { useMemo } from "react";
import { useGetList } from "ra-core";
import { Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Contact } from "../types";

const FUNNEL_STAGES = [
  { value: "lead", label: "Lead" },
  { value: "student", label: "Student" },
  { value: "client", label: "Client" },
  { value: "corporate", label: "Corporate" },
  { value: "alumni", label: "Alumni" },
] as const;

const STAGE_COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
];

export const FunnelBreakdown = () => {
  const { data: contacts } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 10000 },
  });

  const stageData = useMemo(() => {
    if (!contacts) return [];

    const counts: Record<string, number> = {};
    for (const contact of contacts) {
      const type = contact.contact_type ?? "lead";
      counts[type] = (counts[type] ?? 0) + 1;
    }

    const maxCount = Math.max(...Object.values(counts), 1);

    return FUNNEL_STAGES.map((stage, index) => {
      const count = counts[stage.value] ?? 0;
      const prevCount =
        index > 0 ? (counts[FUNNEL_STAGES[index - 1].value] ?? 0) : 0;
      const conversionRate =
        index > 0 && prevCount > 0
          ? ((count / prevCount) * 100).toFixed(1)
          : null;
      return {
        ...stage,
        count,
        percentage: (count / maxCount) * 100,
        conversionRate,
        color: STAGE_COLORS[index],
      };
    });
  }, [contacts]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Filter className="size-5 text-muted-foreground" />
          <CardTitle>Contact Type Breakdown</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stageData.map((stage, index) => (
            <div key={stage.value}>
              {stage.conversionRate && (
                <div className="flex items-center justify-center text-xs text-muted-foreground mb-1">
                  <span className="border-l border-muted-foreground/30 h-3 mr-1.5" />
                  {stage.conversionRate}% conversion
                  <span className="border-l border-muted-foreground/30 h-3 ml-1.5" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-24 text-sm font-medium truncate">
                  {stage.label}
                </span>
                <div className="flex-1 h-7 bg-muted rounded overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded transition-all flex items-center px-2`}
                    style={{ width: `${Math.max(stage.percentage, 3)}%` }}
                  >
                    {stage.percentage > 15 && (
                      <span className="text-xs text-white font-medium">
                        {stage.count}
                      </span>
                    )}
                  </div>
                </div>
                {stage.percentage <= 15 && (
                  <span className="w-10 text-sm text-right tabular-nums">
                    {stage.count}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
