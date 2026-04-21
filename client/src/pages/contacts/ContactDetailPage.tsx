import { useParams, Link } from "react-router-dom";
import { useContact } from "@/hooks/useApi";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: contact, isLoading } = useContact(id!);

  if (isLoading) return <p className="text-zinc-500">Loading...</p>;
  if (!contact) return <p className="text-zinc-500">Contact not found</p>;

  const c = contact as Record<string, unknown>;
  const registrations = (c.registrations ?? []) as Array<
    Record<string, unknown>
  >;
  const payments = (c.payments ?? []) as Array<Record<string, unknown>>;
  const activities = (c.activities ?? []) as Array<Record<string, unknown>>;

  return (
    <div>
      <Link
        to="/contacts"
        className="text-sm text-zinc-500 hover:text-gold mb-4 inline-block"
      >
        &larr; Back to contacts
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-lg">
          {(c.firstName as string)?.[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {c.firstName as string} {c.lastName as string}
          </h1>
          <p className="text-zinc-400 text-sm">{c.email as string}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <StatusBadge value={c.contactType as string} />
          <StatusBadge value={c.funnelStage as string} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Lead Score</p>
          <p className="text-2xl font-bold text-gold">
            {c.leadScore as number}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Lead Source</p>
          <p className="text-lg text-zinc-100">
            {(c.leadSource as string) ?? "Unknown"}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Since</p>
          <p className="text-lg text-zinc-100">
            {new Date(c.createdAt as string).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Workshops */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">
          Workshop History
        </h2>
        {registrations.length === 0 ? (
          <p className="text-zinc-500 text-sm">No workshops attended</p>
        ) : (
          <div className="space-y-2">
            {registrations.map((r) => {
              const w = r.workshop as Record<string, unknown>;
              return (
                <div
                  key={r.id as string}
                  className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0"
                >
                  <span className="text-zinc-300">{w.title as string}</span>
                  <div className="flex gap-2 items-center">
                    <StatusBadge value={r.paymentStatus as string} />
                    {r.attended === true && (
                      <span className="text-green-400 text-xs">Attended</span>
                    )}
                    {r.attended === false && (
                      <span className="text-red-400 text-xs">No-show</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-zinc-500 text-sm">No payments</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id as string}
                className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0"
              >
                <span className="text-zinc-300">
                  ${((p.amountCents as number) / 100).toFixed(2)} —{" "}
                  {p.productType as string}
                </span>
                <StatusBadge value={p.status as string} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">
          Activity Timeline
        </h2>
        {activities.length === 0 ? (
          <p className="text-zinc-500 text-sm">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div
                key={a.id as string}
                className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0"
              >
                <span className="text-zinc-300 text-sm">
                  {a.action as string}
                </span>
                <span className="text-zinc-500 text-xs">
                  {new Date(a.createdAt as string).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
