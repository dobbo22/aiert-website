import { FUNNEL_STEPS, funnelTotals } from "@/lib/tapcardFunnel";
import { isAdminRequest } from "@/lib/adminRequest";

export const metadata = { title: "TapCard setup funnel — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  setup_started: "Opened setup", route_business: "Chose A business", route_person: "Chose Just me", card_built: "Card built",
  card_shared: "Card shared", offer_tapped: "Tapped Send your first offer", paywall_seen: "Saw the Promote screen", promote_started: "Started Promote",
  lookup_used: "Searched Find your business", lookup_picked: "Picked a business from the list", scan_used: "Scanned a paper card",
  phone_hint_used: "Used this phone's number",
  clip_opened: "App Clip: opened from a QR code", clip_offer_claimed: "App Clip: claimed an offer", clip_get_app_tapped: "App Clip: tapped Get the app",
  web_offer_claimed: "Website card: claimed an offer", web_get_app_tapped: "Website card: tapped Get the app", apple_signin_used: "Used Sign in with Apple", contacts_used: "Filled from Contacts",
};

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  const days = Math.min(365, Math.max(1, Number((await searchParams).days) || 30));
  const rows = await funnelTotals(days).catch(() => null);
  const total = (step: string, plat?: string) => (rows ?? []).filter((r) => r.step === step && (!plat || r.platform === plat)).reduce((a, r) => a + r.n, 0);
  const started = total("setup_started");
  const pct = (n: number) => (started ? `${Math.round((n / started) * 100)}%` : "–");
  const cell: React.CSSProperties = { padding: "6px 12px", textAlign: "right" };
  return (
    <div>
      <p className="text-cloud" style={{ marginBottom: "1rem" }}>
        How many people reached each step of TapCard setup in the last {days} days (<a href="?days=7" className="underline">7</a> · <a href="?days=30" className="underline">30</a> · <a href="?days=90" className="underline">90</a>).
        Counts only: nothing identifies a person or a card. The first steps need the app version that sends them (3.2 / 1.6.0 onwards).
      </p>
      {!rows ? <p className="text-cloud">No data yet.</p> : (
        <table className="text-cloud" style={{ borderCollapse: "collapse" }}>
          <thead><tr><th style={{ ...cell, textAlign: "left" }}>Step</th><th style={cell}>iPhone</th><th style={cell}>Android</th><th style={cell}>Total</th><th style={cell}>% of opened setup</th></tr></thead>
          <tbody>
            {FUNNEL_STEPS.map((s) => (
              <tr key={s} style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
                <td style={{ ...cell, textAlign: "left" }}>{LABEL[s]}</td>
                <td style={cell}>{total(s, "ios")}</td><td style={cell}>{total(s, "android")}</td>
                <td style={cell}><strong>{total(s)}</strong></td><td style={cell}>{pct(total(s))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
