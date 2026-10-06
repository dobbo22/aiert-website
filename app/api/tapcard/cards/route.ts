import { NextRequest, NextResponse, after } from "next/server";
import { countRecentCreates, createCard, getCard, listNotifiableRecipients, markRecipientNotified, setAddressIfEmpty, setBrandColor, updateCard } from "@/lib/tapcardDb";
import { canEdit, clientIpHash, hashSecret, readEditToken } from "@/lib/tapcardAuth";
import { parsePassStyle } from "@/lib/tapcardPassStyle";
import { refreshGoogleWalletPass } from "@/lib/googleWallet";
import { resolveSiteBranding } from "@/lib/siteBrandColor";
import { applyOrgLocks } from "@/lib/tapcardBiz";
import { sendCardUpdatedEmail } from "@/lib/tapcardRecipientEmail";

// Fields worth quietly notifying recipients about — avatar/colour tweaks
// shouldn't spam anyone who was sent this card directly.
const NOTIFY_WATCHLIST = ["title", "company", "phone", "email"] as const;

interface CardBody {
  id?: string;
  label?: string;
  groupingID?: string;
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  linkedInURL?: string;
  twitterURL?: string;
  instagramURL?: string;
  facebookURL?: string;
  facebookIsPage?: boolean;
  tiktokURL?: string;
  whatsAppURL?: string;
  passStyle?: string;
  /// The app's save-confirm dialog ("Don't notify them") — skips the
  /// quiet recipient email for this save only, see NOTIFY_WATCHLIST below.
  suppressNotify?: boolean;
}

// Same rules as the iOS app's SocialProfileLink: a bare handle ("@Aiert")
// becomes a profile URL, a scheme-less URL gets https://. Covers cards
// shared by app builds that didn't normalize before sending.
const SOCIAL_PROFILES = {
  linkedin: { base: "https://www.linkedin.com/in/", domains: ["linkedin.com"] },
  x: { base: "https://x.com/", domains: ["x.com", "twitter.com"] },
  instagram: { base: "https://www.instagram.com/", domains: ["instagram.com"] },
  facebook: { base: "https://www.facebook.com/", domains: ["facebook.com", "fb.com"] },
  tiktok: { base: "https://www.tiktok.com/@", domains: ["tiktok.com"] },
};

function socialUrl(raw: string | undefined, platform: keyof typeof SOCIAL_PROFILES): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const { base, domains } = SOCIAL_PROFILES[platform];
  let url: string;
  if (/^https?:\/\//i.test(value)) url = value;
  else if (value.includes("/") || domains.some((d) => value.toLowerCase().includes(d))) url = `https://${value}`;
  else {
    const handle = value.replace(/^[@\s]+|\s+$/g, "");
    url = handle ? base + handle : "";
  }
  return url.slice(0, 300);
}

// WhatsApp links are wa.me/<digits>, not a handle — a typed phone number
// gets its punctuation/spaces stripped down to digits; an already-pasted
// wa.me or whatsapp.com link is kept as-is (scheme-less gets https://).
function whatsAppUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (/wa\.me|whatsapp\.com/i.test(value)) {
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return url.slice(0, 300);
  }
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}`.slice(0, 300) : "";
}

function sanitize(body: CardBody) {
  return {
    label: (body.label ?? "").trim().slice(0, 60),
    grouping_id: (body.groupingID ?? "").trim().slice(0, 100),
    name: (body.name ?? "").trim().slice(0, 200),
    title: (body.title ?? "").trim().slice(0, 200),
    company: (body.company ?? "").trim().slice(0, 200),
    phone: (body.phone ?? "").trim().slice(0, 60),
    email: (body.email ?? "").trim().slice(0, 200),
    website: (body.website ?? "").trim().slice(0, 300),
    address: (body.address ?? "").trim().slice(0, 300),
    linkedin_url: socialUrl(body.linkedInURL, "linkedin"),
    twitter_url: socialUrl(body.twitterURL, "x"),
    instagram_url: socialUrl(body.instagramURL, "instagram"),
    facebook_url: socialUrl(body.facebookURL, "facebook"),
    facebook_is_page: body.facebookIsPage === true,
    tiktok_url: socialUrl(body.tiktokURL, "tiktok"),
    whatsapp_url: whatsAppUrl(body.whatsAppURL),
    pass_style: parsePassStyle(body.passStyle),
  };
}

// No accounts: each card has a secret edit token that only the owner's app
// holds (see lib/tapcardAuth.ts). Creating a card sets it; updating needs it.
const MAX_CREATES_PER_HOUR = 20;

export async function POST(req: NextRequest) {
  const token = readEditToken(req);
  if (!token) return NextResponse.json({ error: "edit token required" }, { status: 401 });

  const body = (await req.json()) as CardBody;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  let fields = sanitize(body);

  if (body.id) {
    const existing = await getCard(body.id);
    if (existing) {
      if (!(await canEdit(existing, token))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      // A company card (TapCard for Business) keeps its locked fields
      // whatever the app sent — see applyOrgLocks.
      fields = await applyOrgLocks(existing as unknown as Record<string, unknown>, fields);
      const watchedChanged = NOTIFY_WATCHLIST.some((f) => fields[f] !== existing[f]);
      await updateCard(body.id, fields);
      const websiteChanged = fields.website !== existing.website;
      const addressIsBlank = !fields.address;
      // A pass already saved in Google Wallet picks up the change (Apple
      // passes are fixed once added — the app offers to re-add instead).
      after(async () => {
        const card = await getCard(body.id!);
        if (!card) return;
        if (websiteChanged || addressIsBlank) await resolveAndSaveSiteBranding(card.id, fields.website, addressIsBlank);
        await refreshGoogleWalletPass(card, `https://tapcard.aiert.co.uk/s/${card.id}`).catch(() => {});
        if (watchedChanged && !body.suppressNotify) await notifyRecipientsOfChange(card.id, card.name, fields);
      });
      return NextResponse.json({ id: body.id });
    }
    // Falls through to create — an id the iOS app has locally but that no
    // longer exists server-side (e.g. after a "Stop sharing" delete)
    // should re-create rather than 404, so re-sharing just works.
  }

  const ipHash = clientIpHash(req);
  if ((await countRecentCreates(ipHash)) >= MAX_CREATES_PER_HOUR) {
    return NextResponse.json({ error: "too many cards created, try again later" }, { status: 429 });
  }
  const id = await createCard(fields, hashSecret(token), ipHash);
  // Resolved after responding — the app gets its id back immediately and
  // picks up the colour/address on its next GET of the card (a few seconds
  // later, same deferred pattern as the Google Wallet pass refresh above).
  if (fields.website) after(() => resolveAndSaveSiteBranding(id, fields.website, !fields.address));
  return NextResponse.json({ id });
}

/// Clears the stored colour if the website was removed, rather than leaving
/// a stale colour from whatever site used to be there. Address is left
/// alone unless it's still blank — see setAddressIfEmpty, which this relies
/// on to never overwrite one the person typed themselves.
async function resolveAndSaveSiteBranding(id: string, website: string, fillAddress: boolean): Promise<void> {
  const branding = website ? await resolveSiteBranding(website).catch(() => ({ color: null, address: null })) : { color: null, address: null };
  await setBrandColor(id, branding.color);
  if (fillAddress) await setAddressIfEmpty(id, branding.address);
}

/// Quietly emails anyone the owner previously sent this card directly to —
/// see app/api/tapcard/cards/[id]/recipients. Skips a recipient whose
/// last_notified_snapshot already matches the new watched values, so an
/// edit saved twice in a row (or reverted back) only sends once.
async function notifyRecipientsOfChange(cardId: string, ownerName: string, fields: Record<string, unknown>): Promise<void> {
  const snapshot = Object.fromEntries(NOTIFY_WATCHLIST.map((f) => [f, String(fields[f] ?? "")]));
  const recipients = await listNotifiableRecipients(cardId);
  const link = `https://tapcard.aiert.co.uk/c/${cardId}`;
  for (const recipient of recipients) {
    const unchanged = recipient.last_notified_snapshot && NOTIFY_WATCHLIST.every((f) => recipient.last_notified_snapshot![f] === snapshot[f]);
    if (unchanged) continue;
    await sendCardUpdatedEmail(recipient.email, ownerName, link, recipient.unsubscribe_token).catch((err) => console.error("tapcard recipient notify failed:", err));
    await markRecipientNotified(recipient.id, snapshot);
  }
}
