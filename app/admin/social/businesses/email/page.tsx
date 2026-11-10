import { isAdminRequest } from "@/lib/adminRequest";
import { buildAppUserEmails, campaignState, parseAudience, TEST_ADDRESSES, type Recipient, type SendLogRow } from "@/lib/appUserCampaign";
import TestSender from "./TestSender";
import SendAll from "./SendAll";

export const metadata = { title: "App-user email — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "6px 10px", textAlign: "left", verticalAlign: "top" };
const row: React.CSSProperties = { borderTop: "1px solid rgba(255,255,255,.1)" };

export default async function AppUserEmailPage({ searchParams }: { searchParams: Promise<{ audience?: string }> }) {
  const audience = parseAudience((await searchParams).audience);
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  let list: Recipient[] = [];
  let error: string | null = null;
  let state: { eligible: Recipient[]; suppressedCount: number; alreadySentCount: number; log: SendLogRow[] } | null = null;
  try {
    list = await buildAppUserEmails(audience);
    state = await campaignState(audience);
  } catch (e) { error = e instanceof Error ? e.message : "Failed to build the emails"; }
  return (
    <div className="text-cloud">
      {error && <p className="social-compose-error">{error}</p>}
      <p style={{ marginBottom: 8 }}><a className="underline" href="/admin/social/businesses">&larr; Businesses</a></p>
      <p style={{ marginBottom: 12 }}>
        <strong>&ldquo;Finish your TapCard&rdquo;</strong> email for <strong>{list.length}</strong> real app users {audience === "private" ? "with a private address (gmail, hotmail and similar; Apple relay addresses left out)" : "with their own domain (one per address; Hobart Capital left out)"} (one per address). <a className="underline" href={`?audience=${audience === "private" ? "own" : "private"}`}>Switch to {audience === "private" ? "own-domain" : "private-address"} list</a>.
        Each one is built from what is missing on that person&apos;s card. <strong>Test copies go only to your own addresses. The real send is the separate box below, and needs you to type SEND.</strong>
      </p>
      {state && <SendAll audience={audience} eligible={state.eligible.map((r) => r.business)} suppressed={state.suppressedCount} alreadySent={state.alreadySentCount} log={state.log.map((l) => ({ ...l, sent_at: String(l.sent_at) }))} />}
      <TestSender audience={audience} addresses={TEST_ADDRESSES} recipients={list.map((r) => ({ email: r.email, business: r.business, firstName: r.firstName }))} />
      <div style={{ overflowX: "auto", marginTop: 16 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={cell}>Business</th><th style={cell}>Greeting</th><th style={cell}>Subject</th><th style={cell}>Fixes it asks for</th><th style={cell}>Sent to</th><th style={cell}>Preview</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.email} style={row}>
                <td style={cell}>{r.business}<div style={{ fontSize: ".74rem", opacity: 0.6 }}>{r.email}</div></td>
                <td style={cell}>{r.firstName ? `Hi ${r.firstName},` : "Hi,"}</td>
                <td style={cell}>{r.subject}</td>
                <td style={cell}>{r.fixes.length ? r.fixes.join(", ") : "(complete)"}</td>
                <td style={cell}>{r.sentTo} people</td>
                <td style={cell}><a className="underline" href={`/api/admin/social/businesses/email-preview?email=${encodeURIComponent(r.email)}&audience=${audience}`} target="_blank" rel="noreferrer">Open</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
