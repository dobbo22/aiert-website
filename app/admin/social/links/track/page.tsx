import sql from "@/lib/db";
import { campaignToken, ensureInviteSchema } from "@/lib/tapcardInvites";
import { FREE_PLACES, ladderStatus } from "@/lib/tapcardFounders";
import ResetSendButton from "./ResetSendButton";
import StoreStatsInput from "./StoreStatsInput";

type ChannelRow = {
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  bounced: number;
  clicked: number;
  forwarded_people: number;
  shared_people: number;
};
type CampaignRow = { campaign: string; channel: string; sent: number | null; clicked: number | null; ios_clicks: number; android_clicks: number; desktop_clicks: number };
type StoreRow = { campaign_token: string; store: string; installs: number };
type SendRow = {
  id: number;
  name: string;
  channel: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  first_click_at: string | null;
  click_count: number;
  last_platform: string | null;
  forwarded_people: number;
  shared_people: number;
};
type SpreaderRow = { name: string; forwarded_people: number; shared_people: number };

const CHANNEL_LABEL: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", linkedin: "LinkedIn", messenger: "Messenger", link: "Copied link", share: "Pass-it-on links" };
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const when = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const DEVICE: Record<string, string> = { ios: "iPhone", android: "Android", desktop: "Computer" };

export default async function TrackInvitesPage() {
  let channels: ChannelRow[] = [];
  let campaigns: CampaignRow[] = [];
  let stores: StoreRow[] = [];
  let sends: SendRow[] = [];
  let spreaders: SpreaderRow[] = [];
  let ladder: Awaited<ReturnType<typeof ladderStatus>> | null = null;
  let error: string | null = null;

  try {
    await ensureInviteSchema();
    ladder = await ladderStatus();
    [channels, campaigns, stores, sends, spreaders] = (await Promise.all([
      sql`
        SELECT s.channel, COUNT(DISTINCT s.id)::int AS sent,
               COUNT(DISTINCT s.id) FILTER (WHERE s.delivered_at IS NOT NULL)::int AS delivered,
               COUNT(DISTINCT s.id) FILTER (WHERE s.opened_at IS NOT NULL)::int AS opened,
               COUNT(DISTINCT s.id) FILTER (WHERE s.bounced_at IS NOT NULL)::int AS bounced,
               COUNT(DISTINCT s.id) FILTER (WHERE s.first_click_at IS NOT NULL)::int AS clicked,
               COUNT(DISTINCT COALESCE(k.visitor_id, k.fingerprint, k.id::text)) FILTER (WHERE k.is_forward)::int AS forwarded_people,
               COUNT(DISTINCT COALESCE(k.visitor_id, k.fingerprint, k.id::text)) FILTER (WHERE k.source = 'share')::int AS shared_people
        FROM tapcard_invite_sends s LEFT JOIN tapcard_invite_clicks k ON k.send_id = s.id
        GROUP BY s.channel ORDER BY sent DESC
      `,
      // Rows per App Store / Play campaign token: one per campaign + medium
      // (the person's own link, including forwarded clicks, which carry the
      // same token), then one per campaign for its pass-it-on links.
      sql`
        SELECT s.campaign, s.channel, COUNT(DISTINCT s.id)::int AS sent,
               COUNT(DISTINCT s.id) FILTER (WHERE s.first_click_at IS NOT NULL)::int AS clicked,
               COUNT(k.id) FILTER (WHERE k.platform = 'ios')::int AS ios_clicks,
               COUNT(k.id) FILTER (WHERE k.platform = 'android')::int AS android_clicks,
               COUNT(k.id) FILTER (WHERE k.platform = 'desktop')::int AS desktop_clicks
        FROM tapcard_invite_sends s
        LEFT JOIN tapcard_invite_clicks k ON k.send_id = s.id AND k.source = 'direct'
        GROUP BY s.campaign, s.channel
        UNION ALL
        SELECT s.campaign, 'share', NULL, NULL,
               COUNT(k.id) FILTER (WHERE k.platform = 'ios')::int,
               COUNT(k.id) FILTER (WHERE k.platform = 'android')::int,
               COUNT(k.id) FILTER (WHERE k.platform = 'desktop')::int
        FROM tapcard_invite_clicks k JOIN tapcard_invite_sends s ON s.id = k.send_id
        WHERE k.source = 'share'
        GROUP BY s.campaign
        ORDER BY 1, 2
      `,
      sql`SELECT campaign_token, store, installs FROM tapcard_invite_store_stats`,
      sql`
        SELECT s.id, c.name, s.channel, s.sent_at, s.delivered_at, s.opened_at, s.bounced_at,
               s.first_click_at, s.click_count, s.last_platform,
               COUNT(DISTINCT COALESCE(k.visitor_id, k.fingerprint, k.id::text)) FILTER (WHERE k.is_forward)::int AS forwarded_people,
               COUNT(DISTINCT COALESCE(k.visitor_id, k.fingerprint, k.id::text)) FILTER (WHERE k.source = 'share')::int AS shared_people
        FROM tapcard_invite_sends s
        JOIN tapcard_invite_contacts c ON c.id = s.contact_id
        LEFT JOIN tapcard_invite_clicks k ON k.send_id = s.id
        GROUP BY s.id, c.name
        ORDER BY s.first_click_at DESC NULLS LAST, s.sent_at DESC
        LIMIT 500
      `,
      sql`
        SELECT c.name,
               COUNT(DISTINCT COALESCE(k.visitor_id, k.fingerprint, k.id::text)) FILTER (WHERE k.is_forward)::int AS forwarded_people,
               COUNT(DISTINCT COALESCE(k.visitor_id, k.fingerprint, k.id::text)) FILTER (WHERE k.source = 'share')::int AS shared_people
        FROM tapcard_invite_clicks k
        JOIN tapcard_invite_sends s ON s.id = k.send_id
        JOIN tapcard_invite_contacts c ON c.id = s.contact_id
        WHERE k.is_forward OR k.source = 'share'
        GROUP BY c.id, c.name
        ORDER BY COUNT(DISTINCT COALESCE(k.visitor_id, k.fingerprint, k.id::text)) DESC
        LIMIT 10
      `,
    ])) as [ChannelRow[], CampaignRow[], StoreRow[], SendRow[], SpreaderRow[]];
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't load invite stats";
  }

  const installs = new Map(stores.map((s) => [`${s.campaign_token}|${s.store}`, s.installs]));
  const total = channels.reduce(
    (t, c) => ({ sent: t.sent + c.sent, clicked: t.clicked + c.clicked, spread: t.spread + c.forwarded_people + c.shared_people }),
    { sent: 0, clicked: 0, spread: 0 },
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
          <span className="admin-stat-label">Recipients who clicked ({pct(total.clicked, total.sent)})</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{total.spread}</span>
          <span className="admin-stat-label">Others reached by forwarding or passing it on</span>
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
              <th>Forwarded to</th><th>Passed on to</th>
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
                <td>{c.forwarded_people || ""}</td>
                <td>{c.shared_people || ""}</td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr><td colSpan={9} className="admin-empty-cell">Nothing sent yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {spreaders.length > 0 && (
        <>
          <h2 className="admin-subtitle invite-h2">Top spreaders</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Others who clicked a forwarded invite</th><th>Others who clicked their pass-it-on link</th></tr>
              </thead>
              <tbody>
                {spreaders.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>{s.forwarded_people || ""}</td>
                    <td>{s.shared_people || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="admin-subtitle invite-h2">Founder places</h2>
      <p className="admin-mailbroom-note">
        {ladder ? (
          <>
            <strong>{ladder.counted.toLocaleString("en-GB")}</strong> people counted in the apps (iPhone and Android) ·{" "}
            <strong>{ladder.freePlacesLeft.toLocaleString("en-GB")}</strong> of {FREE_PLACES.toLocaleString("en-GB")} free
            founder places left · a newcomer now pays <strong>{ladder.nextPrice}</strong> for life. Counted when someone
            opens a version of the app with the founder check.
          </>
        ) : (
          "Couldn't load the founder count."
        )}
      </p>


      <h2 className="admin-subtitle invite-h2">Clicks vs store installs</h2>
      <p className="admin-mailbroom-note">
        The stores don&apos;t say <em>who</em> installed, only how many came from each campaign link.
        Type in the installs from <strong>App Store Connect → Analytics → Acquisition → Campaigns</strong>{" "}
        (each row&apos;s campaign token is the &quot;Campaign&quot; there) and Play Console&apos;s
        acquisition report, and this
        compares them with the clicks. Forwarded clicks share the original medium&apos;s token; pass-it-on
        links have their own (<code>…-share</code>).
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
                  <td>{c.sent ?? "—"}</td>
                  <td>{c.clicked ?? "—"}</td>
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
              <th>Name</th><th>Medium</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Clicks</th>
              <th>Device</th><th>Forwarded to</th><th>Passed on to</th><th></th>
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
                <td>{s.last_platform ? DEVICE[s.last_platform] ?? "" : ""}</td>
                <td>{s.forwarded_people ? `${s.forwarded_people} ${s.forwarded_people === 1 ? "person" : "people"}` : ""}</td>
                <td>{s.shared_people ? `${s.shared_people} ${s.shared_people === 1 ? "person" : "people"}` : ""}</td>
                <td><ResetSendButton sendId={s.id} name={s.name} /></td>
              </tr>
            ))}
            {sends.length === 0 && (
              <tr><td colSpan={11} className="admin-empty-cell">Nothing sent yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="admin-mailbroom-note invite-footnote">
        <strong>How to read this.</strong> Each person&apos;s own link counts the first person to click it as
        them; anyone else who clicks it later (on a different phone or computer) shows as{" "}
        <strong>Forwarded to</strong>. Clicks on their pass-it-on link always count as{" "}
        <strong>Passed on to</strong>. Both count people, not taps: the same person clicking twice counts
        once. It can&apos;t tell you <em>who</em> they forwarded it to, and if the recipient opens their own
        link on a second device, that will show as one forward. Link previews fetched by WhatsApp and
        email scanners are never counted. Email &quot;opened&quot; is approximate (Apple Mail privacy
        loads images for unread mail), and WhatsApp can&apos;t report delivery or reads, so only clicks
        are tracked there.
      </p>
    </div>
  );
}
