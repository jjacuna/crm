import { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkshops, useCreateWorkshop } from "@/hooks/useApi";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function WorkshopsListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: workshops, isLoading } = useWorkshops(
    statusFilter || undefined,
  );
  const createWorkshop = useCreateWorkshop();
  const [showForm, setShowForm] = useState(false);

  const list = (workshops ?? []) as Array<Record<string, unknown>>;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createWorkshop.mutateAsync({
      title: form.get("title"),
      date: new Date(form.get("date") as string).toISOString(),
      zoomLink: form.get("zoomLink"),
    });
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Workshops</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gold text-zinc-950 font-semibold rounded-lg hover:bg-gold-light transition-colors text-sm"
        >
          + New Workshop
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {["", "upcoming", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-sm ${
              statusFilter === s
                ? "bg-gold/10 text-gold border border-gold/30"
                : "text-zinc-400 border border-zinc-800"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3"
        >
          <input
            name="title"
            placeholder="Workshop title"
            required
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          />
          <input
            name="date"
            type="datetime-local"
            required
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          />
          <input
            name="zoomLink"
            placeholder="Zoom link"
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          />
          <div className="col-span-3 flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gold text-zinc-950 font-semibold rounded-lg text-sm"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-zinc-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : (
        <div className="grid gap-3">
          {list.map((w) => {
            const count =
              (w._count as Record<string, number>)?.registrations ?? 0;
            return (
              <Link
                key={w.id as string}
                to={`/workshops/${w.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-gold/30 transition-colors flex justify-between items-center"
              >
                <div>
                  <h3 className="text-zinc-100 font-medium">
                    {w.title as string}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {new Date(w.date as string).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-sm">
                    {count} registered
                  </span>
                  <StatusBadge value={w.status as string} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
