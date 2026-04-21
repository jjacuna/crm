import { useParams, Link } from "react-router-dom";
import { useWorkshop } from "@/hooks/useApi";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshop(id!);
  const qc = useQueryClient();

  if (isLoading) return <p className="text-zinc-500">Loading...</p>;
  if (!workshop) return <p className="text-zinc-500">Workshop not found</p>;

  const w = workshop as Record<string, unknown>;
  const registrations = (w.registrations ?? []) as Array<
    Record<string, unknown>
  >;

  const toggleAttendance = async (regId: string, attended: boolean | null) => {
    const next = attended === true ? false : attended === false ? null : true;
    await api.patch(`/workshops/registrations/${regId}/attendance`, {
      attended: next,
    });
    qc.invalidateQueries({ queryKey: ["workshops", id] });
  };

  return (
    <div>
      <Link
        to="/workshops"
        className="text-sm text-zinc-500 hover:text-gold mb-4 inline-block"
      >
        &larr; Back to workshops
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {w.title as string}
          </h1>
          <p className="text-zinc-400">
            {new Date(w.date as string).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <StatusBadge value={w.status as string} />
      </div>

      {Boolean(w.zoomLink) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-zinc-500 mb-1">Zoom Link</p>
          <p className="text-zinc-300 text-sm break-all">
            {w.zoomLink as string}
          </p>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Registrations ({registrations.length})
          </h2>
        </div>

        {registrations.length === 0 ? (
          <p className="text-zinc-500 text-sm">No registrations yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
                  Payment
                </th>
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
                  Attended
                </th>
                <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const contact = r.contact as Record<string, unknown>;
                return (
                  <tr
                    key={r.id as string}
                    className="border-b border-zinc-800/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/contacts/${contact.id}`}
                        className="text-zinc-100 hover:text-gold font-medium"
                      >
                        {contact.firstName as string}{" "}
                        {contact.lastName as string}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">
                      {contact.email as string}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={r.paymentStatus as string} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          toggleAttendance(
                            r.id as string,
                            r.attended as boolean | null,
                          )
                        }
                        className="text-sm px-2 py-1 rounded border border-zinc-700 hover:border-gold/30 transition-colors"
                      >
                        {r.attended === true ? (
                          <span className="text-green-400">Yes</span>
                        ) : r.attended === false ? (
                          <span className="text-red-400">No</span>
                        ) : (
                          <span className="text-zinc-500">?</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-sm">
                      {r.source as string}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
