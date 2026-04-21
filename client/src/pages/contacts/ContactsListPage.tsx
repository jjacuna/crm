import { useState } from "react";
import { Link } from "react-router-dom";
import { useContacts, useCreateContact } from "@/hooks/useApi";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function ContactsListPage() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useContacts(
    search ? { search } : undefined,
  );
  const createContact = useCreateContact();
  const [showForm, setShowForm] = useState(false);

  const contactList = (contacts ?? []) as Array<Record<string, unknown>>;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createContact.mutateAsync({
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
      leadSource: form.get("leadSource"),
    });
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Contacts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gold text-zinc-950 font-semibold rounded-lg hover:bg-gold-light transition-colors text-sm"
        >
          + New Contact
        </button>
      </div>

      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 mb-4 focus:border-gold focus:outline-none"
      />

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3"
        >
          <input
            name="firstName"
            placeholder="First name"
            required
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          />
          <input
            name="lastName"
            placeholder="Last name"
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          />
          <select
            name="leadSource"
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          >
            <option value="">Lead source...</option>
            <option value="tiktok">TikTok</option>
            <option value="workshop">Workshop</option>
            <option value="youtube">YouTube</option>
            <option value="referral">Referral</option>
            <option value="linkedin">LinkedIn</option>
            <option value="cold_outreach">Cold Outreach</option>
            <option value="other">Other</option>
          </select>
          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gold text-zinc-950 font-semibold rounded-lg text-sm"
            >
              Save
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                  Source
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {contactList.map((c) => (
                <tr
                  key={c.id as string}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/contacts/${c.id}`}
                      className="text-zinc-100 hover:text-gold transition-colors font-medium"
                    >
                      {c.firstName as string} {c.lastName as string}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {c.email as string}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={c.contactType as string} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {(c.leadSource as string) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {c.leadScore as number}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
