import sql from "@/lib/db";
import { campaignToken, ensureInviteSchema, playStoreLive } from "@/lib/tapcardInvites";
import StoreStatsInput from "./StoreStatsInput";

type ChannelRow = { channel: string; sent: number; delivered: number; opened: number; bounced: number; clicked: number; clicks: number };
type CampaignRow = { campaign: string; channel: string; sent: number; clicked: number; ios_clicks: number; android_clicks: number; desktop_clicks: number };
type StoreRow = { campaign_token: string; store: string; installs: number };
type SendRow = {
  name: string;
  channel: string;
  campaign: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  first_click_at: string | null;
  click_count: number;
  last_platform: string | null;
};

const CHANNEL_LABEL: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", link: "Copied link" };
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const when = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export default async function TrackInvitesPage() {
  let channels: ChannelRow[] = [];
  let campaigns: CampaignRow[] = [];
  let stores: StoreRow[] = [];
  let sends: SendRow[] = [];
  let error: string | null = null;

  try {
    await ensureInviteSchema();
    [channels, campaigns, stores, sends] = (await Promise.all([
      sql`
        SELECT channel, COUNT(*)::int AS sent,
               COUNT(delivered_at)::int AS delivered, COUNT(opened_at)::int AS opened,
               COUNT(bounced_at)::int AS bounced, COUNT(first_click_at)::int AS clicked,
               COALESCE(SUM(click_count), 0)::int AS clicks
        FROM tapcard_invite_sends GROUP BY channel ORDER BY sent DESC
      `,
      sql`
        SELECT s.campaign, s.channel, COUNT(DISTINCT s.id)::int AS sent,
               COUNT(DISTINCT s.id) FILTER (WHERE s.first_click_at IS NOT NULL)::int AS clicked,
               COUNT(k.id) FILTER (WHERE k.platform = 'ios')::int AS ios_clicks,
               COUNT(k.id) FILTER (WHERE k.platform = 'android')::int AS android_clicks,
               COUNT(k.id) FILTER (WHERE k.platform = 'desktop')::int AS desktop_clicks
        FROM tapcard_invite_sends s LEFT JOIN tapcard_invite_clicks k ON k.send_id = s.id
        GROUP BY s.campaign, s.channel ORDER BY s.campaign, s.channel
      `,
      sql`SELECT campaign_token, store, installs FROM tapcard_invite_store_stats`,
      sql`
        SELECT c.name, s.channel, s.campaign, s.sent_at, s.delivered_at, s.opened_at, s.bounced_at,
               s.first_click_at, s.click_count, s.last_platform
        FROM tapcard_invite_sends s JOIN tapcard_invite_contacts c ON c.id = s.contact_id
        ORDER BY s.first_click_at DESC NULLS LAST, s.sent_at DESC
        LIMIT 500
      `,
    ])) as [ChannelRow[], CampaignRow[], StoreRow[], SendRow[]];
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't load invite stats";
  }

  const installs = new Map(stores.map((s) => [`${s.campaign_token}|${s.store}`, s.installs]));
  const total = channels.reduce(
    (t, c) => ({ sent: t.sent + c.sent, clicked: t.clicked + c.clicked }),
    { sent: 0, clicked: 0 },
  );
  const totalInstalls = stores.reduce((n, s) => n + s.installs, 0);

  return (
    <div>
      {error && <p className="social-compose-error">{error}</p>}

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-value">{total.sent}</span>
          <span className="admin-stat-label">Invites sent</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{total.clicked}</span>
          <span className="admin-stat-label">People who clicked ({pct(total.clicked, total.sent)})</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{totalInstalls}</span>
          <span className="admin-stat-label">Installs reported by the stores</span>
        </div>
      </div>

      <h2 className="admin-subtitle invite-h2">By medium</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Medium</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Bounced</th><th>Clicked</th><th>Click rate</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.channel}>
                <td>{CHANNEL_LABEL[c.channel] ?? c.channel}</td>
                <td>{c.sent}</td>
                <td>{c.channel === "email" ? c.delivered : "n/a"}</td>
                <td>{c.channel === "email" ? `${c.opened} (${pct(c.opened, c.sent)})` : "n/a"}</td>
                <td>{c.channel === "email" ? c.bounced : "n/a"}</td>
                <td>{c.clicked}</td>
                <td>{pct(c.clicked, c.sent)}</td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr><td colSpan={7} className="admin-empty-cell">Nothing sent yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="admin-subtitle invite-h2">Clicks vs store installs</h2>
      <p className="admin-mailbroom-note">
        The stores don&apos;t say <em>who</em> installed, only how many came from each campaign link.
        Type in the installs from <strong>App Store Connect → Analytics → Acquisition → Campaigns</strong>{" "}
        (each row&apos;s campaign token is the &quot;Campaign&quot; there) and Play Console&apos;s
        acquisition report{playStoreLive() ? "" : " (once Google approves the Android app)"}, and this
        compares them with the clicks.
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Campaign token</th><th>Sent</th><th>Clicked</th><th>iPhone clicks</th><th>App Store installs</th>
              <th>Android clicks</th><th>Play installs</th><th>Desktop clicks</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const token = campaignToken(c.campaign, c.channel);
              const ios = installs.get(`${token}|appstore`);
              const play = installs.get(`${token}|play`);
              return (
                <tr key={token}>
                  <td className="admin-code">{token}</td>
                  <td>{c.sent}</td>
                  <td>{c.clicked}</td>
                  <td>{c.ios_clicks}</td>
                  <td>
                    <StoreStatsInput campaignToken={token} store="appstore" initial={ios} />
                    {ios != null && <span className="invite-conv">{pct(ios, c.ios_clicks)} of clicks</span>}
                  </td>
                  <td>{c.android_clicks}</td>
                  <td>
                    <StoreStatsInput campaignToken={token} store="play" initial={play} />
                    {play != null && <span className="invite-conv">{pct(play, c.android_clicks)} of clicks</span>}
                  </td>
                  <td>{c.desktop_clicks}</td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr><td colSpan={8} className="admin-empty-cell">No campaigns yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="admin-subtitle invite-h2">Every invite</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th><th>Medium</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Clicks</th><th>Device</th>
            </tr>
          </thead>
          <tbody>
            {sends.map((s, i) => (
              <tr key={i}>
                <td>{s.name}</td>
                <td>{CHANNEL_LABEL[s.channel] ?? s.channel}</td>
                <td>{when(s.sent_at)}</td>
                <td>{s.bounced_at ? <span className="invite-bad">Bounced</span> : s.channel === "email" ? when(s.delivered_at) || "…" : "n/a"}</td>
                <td>{s.channel === "email" ? when(s.opened_at) : "n/a"}</td>
                <td>{s.first_click_at ? <span className="invite-good">{when(s.first_click_at)}</span> : ""}</td>
                <td>{s.click_count || ""}</td>
                <td>{s.last_platform === "ios" ? "iPhone" : s.last_platform === "android" ? "Android" : s.last_platform === "desktop" ? "Computer" : ""}</td>
              </tr>
            ))}
            {sends.length === 0 && (
              <tr><td colSpan={8} className="admin-empty-cell">Nothing sent yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="admin-mailbroom-note invite-footnote">
        <strong>How to read this.</strong> Clicks are the most reliable number: link previews that WhatsApp
        and email scanners fetch are not counted. Email &quot;opened&quot; is approximate, because Apple Mail loads
        images for privacy (opens counted for unread mail) and some apps block them. WhatsApp can&apos;t
        report delivery or reads to a website, so for WhatsApp only clicks are tracked. Everyone who
        unsubscribes is marked Do not contact on the Send tab.
      </p>
    </div>
  );
}
