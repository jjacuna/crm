import { useState } from "react";
import { useCreate, useGetIdentity, useNotify, useRecordContext } from "ra-core";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageSquarePlus } from "lucide-react";
import type { Contact, Conversation } from "../types";

type ConversationFormData = {
  date: string;
  channel: string;
  summary: string;
  outcome: string;
  next_step: string;
};

export const ConversationCreate = ({
  onCreated,
}: {
  onCreated?: () => void;
}) => {
  const record = useRecordContext<Contact>();
  const [open, setOpen] = useState(false);
  const { identity } = useGetIdentity();
  const [create, { isPending }] = useCreate();
  const notify = useNotify();

  const { register, handleSubmit, setValue, watch, reset } =
    useForm<ConversationFormData>({
      defaultValues: {
        date: new Date().toISOString().split("T")[0],
        channel: "",
        summary: "",
        outcome: "",
        next_step: "",
      },
    });

  const channel = watch("channel");
  const outcome = watch("outcome");

  if (!record) return null;

  const onSubmit = async (data: ConversationFormData) => {
    await create(
      "conversations",
      {
        data: {
          contact_id: record.id,
          sales_id: identity?.id,
          date: data.date,
          channel: data.channel,
          summary: data.summary || null,
          outcome: data.outcome || null,
          next_step: data.next_step || null,
        },
      },
      {
        onSuccess: () => {
          notify("Conversation logged", { type: "success" });
          reset();
          setOpen(false);
          onCreated?.();
        },
        onError: () => {
          notify("Error logging conversation", { type: "error" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-2">
          <MessageSquarePlus className="size-4 mr-2" />
          Log Conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Conversation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Channel</Label>
              <Select
                value={channel}
                onValueChange={(v) => setValue("channel", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="dm">DM</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              placeholder="Brief summary of the conversation..."
              rows={3}
              {...register("summary")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(v) => setValue("outcome", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="follow_up">Follow-up needed</SelectItem>
                <SelectItem value="proposal_sent">Proposal sent</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="no_action">No action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="next_step">Next Step</Label>
            <Input
              id="next_step"
              placeholder="What happens next?"
              {...register("next_step")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !channel}>
              {isPending ? "Saving..." : "Log Conversation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
