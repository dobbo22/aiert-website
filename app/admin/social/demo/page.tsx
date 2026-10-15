import { listDemoLeads } from "@/lib/tapcardPrebuilt";

export const metadata = { title: "TapCard demo leads — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "");

// Inside the Social admin (layout.tsx handles the sign-in). Emails here are also added to Links & Invites as contacts.
export default async function DemoLeadsPage() {
  const leads = await listDemoLeads().catch(() => null);
  return (
    <div>
      <p className="text-cloud" style={{ marginBottom: "1rem" }}>
        Everyone who pressed Build my TapCard on tapcard.aiert.co.uk/demo (their email and website are kept from that moment). \u201CLink sent\u201D shows who then asked for the emailed link. Their email is also in{" "}
        <a href="/admin/social/links" className="underline">Links &amp; Invites</a> as a contact (type &ldquo;demo&rdquo;).
        Each step shows when it first happened: link opened, store button tapped, then TapCard opened with their card (so it
        is installed). Everything is deleted after 60 days by a daily job. Only contact people marked Marketing OK; the others get no marketing from you (they are set to do-not-contact in Links &amp; Invites).
      </p>
        {!leads ? <p className="text-cloud">Couldn&apos;t load the list.</p> : leads.length === 0 ? <p className="text-cloud">Nothing yet.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-left text-sm text-cloud">
              <thead>
                <tr className="border-b border-white/20">
                  {["Built", "Business", "Type", "Email", "Marketing OK", "Link sent", "Link opened", "Store tapped", "App opened"].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.created_at + l.email} className="border-b border-white/10">
                    <td className="px-2 py-2">{fmt(l.created_at)}</td>
                    <td className="px-2 py-2">{l.business_name}{l.website ? <><br /><span className="text-xs">{l.website}</span></> : null}</td>
                    <td className="px-2 py-2">{l.kind}</td>
                    <td className="px-2 py-2">{l.email}</td>
                    <td className="px-2 py-2 font-semibold">{l.marketing_ok ? "Yes" : "No"}</td>
                    <td className="px-2 py-2">{l.link_sent_at ? fmt(l.link_sent_at) : "not asked"}</td>
                    <td className="px-2 py-2">{l.link_opened_at ? `${fmt(l.link_opened_at)}${(l.link_opens ?? 0) > 1 ? ` (${l.link_opens}x)` : ""}` : "—"}</td>
                    <td className="px-2 py-2">{l.store_clicked_at ? `${fmt(l.store_clicked_at)}${l.store_platform ? ` · ${l.store_platform}` : ""}` : "—"}</td>
                    <td className="px-2 py-2 font-semibold">{l.claimed_at ? `${fmt(l.claimed_at)}${l.app_platform ? ` · ${l.app_platform}` : ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
