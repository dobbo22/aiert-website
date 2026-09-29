import crypto from "crypto";
import type { TapCardRecord } from "@/lib/tapcardDb";
import { isPersonalCard, sameName } from "@/lib/tapcardPassStyle";

// Google Wallet version of the Apple pass (lib/pkpass.ts), for Android.
// A Generic pass per shared card: object id `${issuer}.${cardId}`, all under
// one class. Each save request upserts the object through the Wallet REST
// API (so edits reach passes already saved) and returns a signed "Save to
// Google Wallet" link that references it by id.
//
// Env: GOOGLE_WALLET_ISSUER_ID, and GOOGLE_WALLET_SA_KEY_BASE64 — the
// service account's JSON key, base64-encoded. That service account must be
// a user (Developer) on the issuer in the Google Pay & Wallet Console.
//
// Until the issuer has publishing access, only the console's users and test
// accounts can save these passes.

const API = "https://walletobjects.googleapis.com/walletobjects/v1";
const CLASS_SUFFIX = "tapcard_card_v1";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function config() {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const keyBase64 = process.env.GOOGLE_WALLET_SA_KEY_BASE64;
  if (!issuerId || !keyBase64) throw new Error("Missing GOOGLE_WALLET_ISSUER_ID / GOOGLE_WALLET_SA_KEY_BASE64");
  const sa = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf8")) as ServiceAccount;
  return { issuerId, sa, classId: `${issuerId}.${CLASS_SUFFIX}` };
}

function signJwt(payload: object, privateKey: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(payload)}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url");
  return `${unsigned}.${signature}`;
}

// OAuth access token for the Wallet REST API, cached per warm instance.
let cachedToken: { value: string; expires: number } | null = null;
async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }, sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Google OAuth token -> ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function walletApi(sa: ServiceAccount, method: string, path: string, body?: object) {
  return fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Exactly one row on the front: phone | email. With a single row Google puts
// the hero banner above it instead of at the very bottom (where it fell off
// the screen), and the whole pass fits on one screen. Website and socials
// are in the pass details (text modules and links). Without any rows Google
// would show the text modules as default rows instead.
function buildClass(classId: string) {
  const field = (id: string) => ({ firstValue: { fields: [{ fieldPath: `object.textModulesData['${id}']` }] } });
  return {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [{ twoItems: { startItem: field("phone"), endItem: field("email") } }],
      },
    },
  };
}

function buildObject(card: TapCardRecord, classId: string, issuerId: string, shareURL: string) {
  const personal = isPersonalCard(card);
  // Pictures drawn by wallet-hero and wallet-logo (lib/tapcardPassArt): the
  // banner (1032x336) in the card's Wallet style, the wide header logo
  // (TapCard mark + company icon + name, as on the Apple pass — on Android it
  // replaces the round logo and title), and a crisp round logo for list
  // views. `v` changes with every card update, so Google fetches new images
  // instead of reusing its cached copies.
  const origin = new URL(shareURL).origin;
  const version = new Date(card.updated_at).getTime() || 0;
  const heroUri = `${origin}/api/cards/${card.id}/wallet-hero?v=${version}`;
  const logoUri = `${origin}/api/cards/${card.id}/wallet-logo?v=${version}`;
  const wideLogoUri = `${origin}/api/cards/${card.id}/wallet-logo?wide=1&v=${version}`;
  const text = (id: string, header: string, body: string) => (body ? [{ id, header, body }] : []);
  const socials: [string, string][] = [
    ["LinkedIn", card.linkedin_url],
    ["X", card.twitter_url],
    ["Instagram", card.instagram_url],
    [card.facebook_is_page ? "Facebook Page" : "Facebook", card.facebook_url],
    ["TikTok", card.tiktok_url],
  ];
  const localized = (value: string) => ({ defaultValue: { language: "en-GB", value } });
  const owner = card.company || card.name;

  return {
    id: `${issuerId}.${card.id}`,
    classId,
    state: "ACTIVE",
    // Top line (also what Wallet shows for a collapsed pass): company logo +
    // company name (the person's name when there's no company), plus the
    // card's own name when it adds something — "Aiert · Business",
    // "Martin Dobson · Personal" — so several cards are easy to tell apart.
    logo: { sourceUri: { uri: logoUri }, contentDescription: localized(owner) },
    wideLogo: { sourceUri: { uri: wideLogoUri }, contentDescription: localized(owner) },
    heroImage: { sourceUri: { uri: heroUri }, contentDescription: localized(owner) },
    cardTitle: localized(card.label && !sameName(card.label, owner) ? `${owner} · ${card.label}` : owner),
    // Job title above the name, as on the Apple pass.
    ...(card.title ? { subheader: localized(card.title) } : {}),
    header: localized(card.name),
    hexBackgroundColor: personal ? "#422975" : "#111318",
    // Only what the front row shows; Google also lists these under the card,
    // so everything else is a tappable link below rather than repeated text.
    textModulesData: [
      ...text("phone", "Phone", card.phone),
      ...text("email", "Email", card.email),
    ],
    // Each action names its value ("Call 020…"), so the details list holds
    // every way to reach them once, in the order people use them.
    linksModuleData: {
      uris: [
        ...(card.phone ? [{ uri: `tel:${card.phone.replace(/\s/g, "")}`, description: `Call ${card.phone}`, id: "call" }] : []),
        ...(card.email ? [{ uri: `mailto:${card.email}`, description: `Email ${card.email}`, id: "email" }] : []),
        ...(card.website ? [{ uri: /^https?:\/\//i.test(card.website) ? card.website : `https://${card.website}`, description: card.website.replace(/^https?:\/\//i, ""), id: "website" }] : []),
        ...socials.filter(([, url]) => url).map(([name, url]) => ({ uri: url, description: name, id: name.toLowerCase().replace(/\W/g, "") })),
        { uri: shareURL, description: "View card online", id: "view" },
      ],
    },
    barcode: { type: "QR_CODE", value: shareURL },
    ...(card.grouping_id ? { groupingInfo: { groupingId: card.grouping_id } } : {}),
  };
}

async function upsert(sa: ServiceAccount, kind: "genericClass" | "genericObject", resource: { id: string }) {
  const insert = await walletApi(sa, "POST", `/${kind}`, resource);
  if (insert.ok) return;
  if (insert.status !== 409) throw new Error(`${kind} insert -> ${insert.status}: ${await insert.text()}`);
  const update = await walletApi(sa, "PUT", `/${kind}/${encodeURIComponent(resource.id)}`, resource);
  if (!update.ok) throw new Error(`${kind} update -> ${update.status}: ${await update.text()}`);
}

/// Pushes a card's current details and style to its pass if one was ever
/// created — Google updates it on people's phones. Cards never added to
/// Google Wallet have no object (404), and nothing is created for them.
export async function refreshGoogleWalletPass(card: TapCardRecord, shareURL: string): Promise<void> {
  if (!process.env.GOOGLE_WALLET_ISSUER_ID) return;
  const { issuerId, sa, classId } = config();
  const object = buildObject(card, classId, issuerId, shareURL);
  const res = await walletApi(sa, "PUT", `/genericObject/${encodeURIComponent(object.id)}`, object);
  if (!res.ok && res.status !== 404) throw new Error(`genericObject refresh -> ${res.status}: ${await res.text()}`);
}

let classReady: Promise<void> | null = null;

/** Creates/updates the card's pass and returns its "Save to Google Wallet" URL. */
export async function googleWalletSaveUrl(card: TapCardRecord, shareURL: string): Promise<string> {
  const { issuerId, sa, classId } = config();
  if (!classReady) {
    classReady = upsert(sa, "genericClass", buildClass(classId)).catch((err) => {
      classReady = null;
      throw err;
    });
  }
  await classReady;
  const object = buildObject(card, classId, issuerId, shareURL);
  await upsert(sa, "genericObject", object);
  const jwt = signJwt({
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    origins: ["https://tapcard.aiert.co.uk"],
    payload: { genericObjects: [{ id: object.id }] },
  }, sa.private_key);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
