import crypto from "crypto";
import sql from "@/lib/db";

// TapCard invite campaign: personalised "free gift" messages sent to Martin's
// own contacts by email (Resend) or WhatsApp (wa.me, sent by hand), each
// with its own tracked link — tapcard.aiert.co.uk/i/<token> — so the admin
// Invites tab can show who was sent what, by which medium, and who clicked
// through to the App Store / Play Store. Installs can't be tied to a person
// (the stores don't expose that); they're compared per campaign + medium
// instead, via App Store campaign tokens (ct=) and Play referrer UTMs.

export const TAPCARD_APP_STORE_ID = "6816003159";
export const TAPCARD_PLAY_PACKAGE = "com.mailbroom.tapcard";
export const INVITE_LINK_ORIGIN = "https://tapcard.aiert.co.uk";

export {
  DEFAULT_CAMPAIGN,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  INVITE_CHANNELS,
  personalise,
  whatsappNumber,
} from "@/lib/inviteTemplates";
export type { InviteChannel } from "@/lib/inviteTemplates";
import { whatsappNumber } from "@/lib/inviteTemplates";

export type InviteContact = {
  id: number;
  name: string;
  first_name: string;
  email: string;
  phone: string;
  company: string;
  do_not_contact: boolean;
};

let schemaReady: Promise<unknown> | null = null;
// Same self-creating schema approach as lib/tapcardDb.ts: production's
// DATABASE_URL can't be read out to run migrations from outside the app.
export function ensureInviteSchema(): Promise<unknown> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS tapcard_invite_contacts (
        id SERIAL PRIMARY KEY,
        dedupe_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        first_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        do_not_contact BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_invite_sends (
          id SERIAL PRIMARY KEY,
          token TEXT NOT NULL UNIQUE,
          contact_id INTEGER NOT NULL REFERENCES tapcard_invite_contacts(id) ON DELETE CASCADE,
          channel TEXT NOT NULL,
          campaign TEXT NOT NULL,
          subject TEXT NOT NULL DEFAULT '',
          message TEXT NOT NULL,
          resend_id TEXT,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          delivered_at TIMESTAMPTZ,
          opened_at TIMESTAMPTZ,
          bounced_at TIMESTAMPTZ,
          first_click_at TIMESTAMPTZ,
          last_click_at TIMESTAMPTZ,
          click_count INTEGER NOT NULL DEFAULT 0,
          last_platform TEXT
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_invite_clicks (
          id BIGSERIAL PRIMARY KEY,
          send_id INTEGER NOT NULL REFERENCES tapcard_invite_sends(id) ON DELETE CASCADE,
          clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          platform TEXT NOT NULL,
          country TEXT
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_invite_store_stats (
          campaign_token TEXT NOT NULL,
          store TEXT NOT NULL,
          installs INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (campaign_token, store)
        )
      `)
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export function newInviteToken(): string {
  // Short enough for a tidy WhatsApp link, unguessable enough that nobody
  // can walk the token space and inflate someone else's click count.
  return crypto.randomBytes(6).toString("base64url");
}

export function inviteLink(token: string): string {
  return `${INVITE_LINK_ORIGIN}/i/${token}`;
}


/// App Store campaign token (ct=, max 40 chars) — what App Store Connect →
/// Analytics → Acquisition → Campaigns reports installs against.
export function campaignToken(campaign: string, channel: string): string {
  return `${campaign}-${channel}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 40);
}

export function appStoreUrl(campaign: string, channel: string): string {
  // Campaign links need the App Store Connect provider token (Analytics →
  // Campaigns → "Generate a campaign link" shows it as pt=). Without it the
  // link still works, it just isn't attributed.
  const pt = process.env.TAPCARD_APPSTORE_PROVIDER_TOKEN;
  if (!pt) return `https://apps.apple.com/app/id${TAPCARD_APP_STORE_ID}`;
  const params = new URLSearchParams({ pt, ct: campaignToken(campaign, channel), mt: "8" });
  return `https://apps.apple.com/app/apple-store/id${TAPCARD_APP_STORE_ID}?${params}`;
}

export function playStoreUrl(campaign: string, channel: string): string {
  const referrer = `utm_source=invite&utm_medium=${channel}&utm_campaign=${campaign}`;
  return `https://play.google.com/store/apps/details?id=${TAPCARD_PLAY_PACKAGE}&referrer=${encodeURIComponent(referrer)}`;
}

/// Flip TAPCARD_PLAY_LIVE=1 in Vercel once Google approves the listing —
/// until then Android clicks get the landing page rather than a Play 404.
export function playStoreLive(): boolean {
  return process.env.TAPCARD_PLAY_LIVE === "1";
}

export type InvitePlatform = "ios" | "android" | "desktop";

export function platformFromUserAgent(ua: string): InvitePlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/// Link-preview fetchers (WhatsApp, iMessage, email security scanners)
/// request the link the moment it's sent — those aren't the person clicking.
export function isBotUserAgent(ua: string): boolean {
  if (!ua) return true;
  return /bot|crawler|spider|preview|WhatsApp|facebookexternalhit|Facebot|Slackbot|TelegramBot|Twitterbot|LinkedInBot|Discordbot|Applebot|Google-PageRenderer|GoogleImageProxy|curl|wget|python|node-fetch|axios|HeadlessChrome|Barracuda|Mimecast|Proofpoint|ZScaler/i.test(
    ua,
  );
}


export function dedupeKey(email: string, phone: string): string | null {
  if (email.trim()) return `e:${email.trim().toLowerCase()}`;
  const wa = whatsappNumber(phone);
  return wa ? `p:${wa}` : null;
}

export async function recordInviteClick(token: string, ua: string, country: string | null) {
  const platform = platformFromUserAgent(ua);
  await ensureInviteSchema();
  const rows = (await sql`
    UPDATE tapcard_invite_sends
    SET click_count = click_count + 1,
        first_click_at = COALESCE(first_click_at, now()),
        last_click_at = now(),
        last_platform = ${platform}
    WHERE token = ${token}
    RETURNING id
  `) as { id: number }[];
  if (rows[0]) {
    await sql`INSERT INTO tapcard_invite_clicks (send_id, platform, country) VALUES (${rows[0].id}, ${platform}, ${country})`;
  }
}

export async function getSendByToken(token: string) {
  await ensureInviteSchema();
  const rows = (await sql`
    SELECT s.id, s.channel, s.campaign, s.contact_id, c.first_name, c.name
    FROM tapcard_invite_sends s JOIN tapcard_invite_contacts c ON c.id = s.contact_id
    WHERE s.token = ${token}
  `) as { id: number; channel: string; campaign: string; contact_id: number; first_name: string; name: string }[];
  return rows[0] ?? null;
}
