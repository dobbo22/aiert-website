import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { listSharedFollowers } from "@/lib/tapcardShare";

export const dynamic = "force-dynamic";

// Shareholders who followed one of this company's listed-company cards and chose to share their details. Admins only.
export default async function BizFollowersPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const rows = await listSharedFollowers(org.id);

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Followers who shared their details</h2>
      <p className="mt-2 text-cloud">
        These people followed one of your investor relations cards and tapped <strong>Follow and share my details</strong>. Anyone who followed
        without sharing is counted on Offers &amp; numbers but never listed here. Someone who stops following, or withdraws, disappears from this list.
      </p>
      <p className="mt-2 text-cloud">
        You decide how to use these details, and you are responsible for that: they were given so you can contact the person about your news and
        shareholder information. Anything promotional needs the usual consent and an unsubscribe.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-cloud">Nobody has shared their details yet.</p>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="font-semibold text-cloud">{rows.length} {rows.length === 1 ? "person" : "people"}</p>
            <a className="btn-gold rounded-xl px-4 py-2 font-semibold" href="/api/tapcard/biz/followers">Download CSV</a>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-cloud">
              <thead>
                <tr className="border-b border-slate">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Card</th>
                  <th className="py-2">Shared on</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.cardId + r.email} className="border-b border-slate/50">
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4">{r.email}</td>
                    <td className="py-2 pr-4">{r.phone || "–"}</td>
                    <td className="py-2 pr-4">{r.company}</td>
                    <td className="py-2">{new Date(r.consentedAt).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
