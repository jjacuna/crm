import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  active: "bg-green-900/50 text-green-400 border-green-800",
  lead: "bg-blue-900/50 text-blue-400 border-blue-800",
  student: "bg-purple-900/50 text-purple-400 border-purple-800",
  client: "bg-gold/10 text-gold border-gold/30",
  paid: "bg-green-900/50 text-green-400 border-green-800",
  pending: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  upcoming: "bg-blue-900/50 text-blue-400 border-blue-800",
  completed: "bg-zinc-800 text-zinc-400 border-zinc-700",
  refunded: "bg-red-900/50 text-red-400 border-red-800",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex px-2 py-0.5 text-xs font-medium rounded-full border",
        colors[value] ?? "bg-zinc-800 text-zinc-400 border-zinc-700",
      )}
    >
      {value}
    </span>
  );
}
