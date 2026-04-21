import { useContacts, useWorkshops } from "@/hooks/useApi";

export function DashboardPage() {
  const { data: contacts } = useContacts();
  const { data: workshops } = useWorkshops("upcoming");

  const contactList = (contacts ?? []) as Array<Record<string, unknown>>;
  const workshopList = (workshops ?? []) as Array<Record<string, unknown>>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-500">Total Contacts</p>
          <p className="text-3xl font-bold text-zinc-100">
            {contactList.length}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-500">Upcoming Workshops</p>
          <p className="text-3xl font-bold text-gold">{workshopList.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-500">Students</p>
          <p className="text-3xl font-bold text-zinc-100">
            {contactList.filter((c) => c.contactType === "student").length}
          </p>
        </div>
      </div>

      {workshopList.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">
            Upcoming Workshops
          </h2>
          <div className="space-y-2">
            {workshopList.map((w) => (
              <div
                key={w.id as string}
                className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0"
              >
                <span className="text-zinc-300">{w.title as string}</span>
                <span className="text-sm text-zinc-500">
                  {new Date(w.date as string).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
