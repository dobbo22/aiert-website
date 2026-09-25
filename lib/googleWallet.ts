import crypto from "crypto";
import type { TapCardRecord } from "@/lib/tapcardDb";
import { isPersonalCard, sameName } from "@/lib/pkpass";

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

// Card rows under the name: phone | email, then website — same order as the
// Apple pass. Rows whose fields are missing on a card are simply hidden.
function buildClass(classId: string) {
  const field = (id: string) => ({ firstValue: { fields: [{ fieldPath: `object.textModulesData['${id}']` }] } });
  return {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          { twoItems: { startItem: field("phone"), endItem: field("email") } },
          { oneItem: { item: field("website") } },
        ],
      },
    },
  };
}

function companyDomain(website: string): string | null {
  try {
    const prefixed = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function buildObject(card: TapCardRecord, classId: string, issuerId: string, shareURL: string) {
  const personal = isPersonalCard(card);
  const domain = card.website ? companyDomain(card.website) : null;
  const logoUri = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : "https://www.aiert.co.uk/tapcard-icon.png";
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
    cardTitle: localized(card.label && !sameName(card.label, owner) ? `${owner} · ${card.label}` : owner),
    // Job title above the name, as on the Apple pass.
    ...(card.title ? { subheader: localized(card.title) } : {}),
    header: localized(card.name),
    hexBackgroundColor: personal ? "#422975" : "#111318",
    textModulesData: [
      ...text("phone", "Phone", card.phone),
      ...text("email", "Email", card.email),
      ...text("website", "Website", card.website),
    ],
    linksModuleData: {
      uris: [
        { uri: shareURL, description: "View card online", id: "view" },
        ...(card.phone ? [{ uri: `tel:${card.phone.replace(/\s/g, "")}`, description: "Call", id: "call" }] : []),
        ...(card.email ? [{ uri: `mailto:${card.email}`, description: "Email", id: "email" }] : []),
        ...socials.filter(([, url]) => url).map(([name, url]) => ({ uri: url, description: name, id: name.toLowerCase().replace(/\W/g, "") })),
      ],
    },
    barcode: { type: "QR_CODE", value: shareURL, alternateText: "Scan to save my contact" },
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
