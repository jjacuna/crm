import { useCreate, useGetIdentity, useListContext, useNotify, useRecordContext } from "ra-core";
import { formatRelative } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, Video, MessageCircle, Mail, MoreHorizontal, ListTodo } from "lucide-react";
import type { Contact, Conversation } from "../types";

const channelIcons: Record<string, React.ReactNode> = {
  phone: <Phone className="size-3.5" />,
  zoom: <Video className="size-3.5" />,
  dm: <MessageCircle className="size-3.5" />,
  email: <Mail className="size-3.5" />,
  other: <MoreHorizontal className="size-3.5" />,
};

const outcomeLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  follow_up: { label: "Follow-up needed", variant: "secondary" },
  proposal_sent: { label: "Proposal sent", variant: "outline" },
  closed_won: { label: "Closed Won", variant: "default" },
  no_action: { label: "No action", variant: "secondary" },
};

const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
  const contact = useRecordContext<Contact>();
  const [create, { isPending }] = useCreate();
  const { identity } = useGetIdentity();
  const notify = useNotify();

  const handleCreateTask = async () => {
    if (!contact || !conversation.next_step) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await create(
      "tasks",
      {
        data: {
          contact_id: contact.id,
          sales_id: identity?.id,
          text: conversation.next_step,
          due_date: tomorrow.toISOString(),
          type: "follow-up",
        },
      },
      {
        onSuccess: () => notify("Task created", { type: "success" }),
        onError: () => notify("Error creating task", { type: "error" }),
      },
    );
  };

  const outcomeInfo = conversation.outcome
    ? outcomeLabels[conversation.outcome]
    : null;

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {channelIcons[conversation.channel]}
          <span className="capitalize">{conversation.channel}</span>
          <span>·</span>
          <span>
            {formatRelative(new Date(conversation.date), new Date())}
          </span>
        </div>
        {outcomeInfo && (
          <Badge variant={outcomeInfo.variant} className="text-xs">
            {outcomeInfo.label}
          </Badge>
        )}
      </div>

      {conversation.summary && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {conversation.summary}
        </p>
      )}

      {conversation.next_step && (
        <div className="flex items-start justify-between gap-2 bg-muted/50 rounded-md p-2">
          <div className="flex items-start gap-1.5 text-sm">
            <ListTodo className="size-3.5 mt-0.5 shrink-0" />
            <span>{conversation.next_step}</span>
          </div>
          {!conversation.task_id && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-6 shrink-0"
              onClick={handleCreateTask}
              disabled={isPending}
            >
              Create Task
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export const ConversationsIterator = () => {
  const { data, isPending } = useListContext<Conversation>();

  if (isPending) return null;
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No conversations logged yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {data.map((conversation) => (
        <ConversationItem key={conversation.id} conversation={conversation} />
      ))}
    </div>
  );
};
