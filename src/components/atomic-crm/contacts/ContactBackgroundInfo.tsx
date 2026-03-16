import { useRecordContext, WithRecord } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { DateField } from "@/components/admin/date-field";
import { SaleName } from "../sales/SaleName";
import type { Contact } from "../types";

const funnelStageLabels: Record<string, string> = {
  lead: "Lead",
  workshop_attendee: "Workshop Attendee",
  community_member: "Community Member",
  ai_consultant: "AI Consultant",
  coaching_client: "Coaching Client",
};

export const ContactBackgroundInfo = () => {
  const record = useRecordContext<Contact>();

  if (!record) return null;

  return (
    <div>
      <WithRecord<Contact>
        render={(record) =>
          record?.background ? (
            <div className="pb-2 text-sm">
              <TextField source="background" record={record} />
            </div>
          ) : null
        }
      />

      {record.funnel_stage && (
        <div className="text-muted-foreground md:py-0.5">
          <span className="text-sm">Funnel stage:</span>{" "}
          <span className="text-sm font-medium text-foreground">
            {funnelStageLabels[record.funnel_stage] ?? record.funnel_stage}
          </span>
        </div>
      )}

      <div className="text-muted-foreground md:py-0.5">
        <span className="text-sm">Added on</span>{" "}
        <DateField
          source="first_seen"
          options={{ year: "numeric", month: "long", day: "numeric" }}
          className="text-sm"
        />
      </div>

      <div className="text-muted-foreground md:py-0.5">
        <span className="text-sm">Last activity on</span>{" "}
        <DateField
          source="last_seen"
          options={{ year: "numeric", month: "long", day: "numeric" }}
          className="text-sm"
        />
      </div>

      <div className="inline-flex text-muted-foreground text-sm md:py-0.5">
        Followed by&nbsp;
        <ReferenceField source="sales_id" reference="sales">
          <SaleName />
        </ReferenceField>
      </div>
    </div>
  );
};
