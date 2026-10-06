import forge from "node-forge";
import JSZip from "jszip";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { TapCardRecord } from "@/lib/tapcardDb";
import { findSiteIcon } from "@/lib/siteIcon";
import { orgLogoBytesForCard } from "@/lib/tapcardBiz";
import { renderBanner, renderLogoLockup } from "@/lib/tapcardPassArt";
import { isPersonalCard, sameName } from "@/lib/tapcardPassStyle";

const PASS_TYPE_IDENTIFIER = "pass.com.mailbroom.tapcard";
const TEAM_IDENTIFIER = "ATMHQQQQ5S";

// Static-snapshot passes only for MVP — no webServiceURL/authenticationToken,
// so a pass never live-updates after a card edit (see the plan: APNs-based
// push updates were explicitly deferred as unnecessary complexity for a
// lead-gen app). Re-adding the pass after an edit is the only way to
// refresh it.
//
// NOTE — certificate expiry: the Pass Type ID certificate used here expires
// 2027-10-23 (see the "TapCard" cert in the Apple Developer portal under
// Certificates). A silently expired cert breaks pass generation with no
// obvious symptom until someone tries to add a pass — put a reminder
// somewhere durable before that date.
let cachedCredentials: { cert: forge.pki.Certificate; key: forge.pki.PrivateKey; wwdr: forge.pki.Certificate } | null = null;

function loadCredentials() {
  if (cachedCredentials) return cachedCredentials;

  const p12Base64 = process.env.TAPCARD_PASS_P12_BASE64;
  const p12Password = process.env.TAPCARD_PASS_P12_PASSWORD;
  const wwdrBase64 = process.env.TAPCARD_WWDR_CERT_BASE64;
  if (!p12Base64 || !p12Password || !wwdrBase64) {
    throw new Error("Missing TAPCARD_PASS_P12_BASE64 / TAPCARD_PASS_P12_PASSWORD / TAPCARD_WWDR_CERT_BASE64");
  }

  const p12Der = forge.util.decode64(p12Base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, p12Password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
  const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
  if (!cert || !key) throw new Error("Could not extract certificate/key from TAPCARD_PASS_P12_BASE64");

  const wwdrDer = forge.util.decode64(wwdrBase64);
  const wwdr = forge.pki.certificateFromAsn1(forge.asn1.fromDer(wwdrDer));

  cachedCredentials = { cert, key, wwdr };
  return cachedCredentials;
}

function buildPassJson(card: TapCardRecord, shareURL: string): object {
  const personal = isPersonalCard(card);
  // Store-card layout, like loyalty cards: header logo (TapCard mark +
  // company icon + company name, drawn by renderLogoLockup) with the card's
  // own name ("Business", "Consulting"…) on the right; then the strip picture
  // with photo, name and title drawn in Sora (renderBanner); then
  // WEBSITE/PHONE and EMAIL as Wallet text. Store cards take up to four of
  // those fields in total.
  const headerFields: { key: string; label: string; value: string }[] = [];
  const secondaryFields: { key: string; label: string; value: string }[] = [];
  const auxiliaryFields: { key: string; label: string; value: string }[] = [];
  const backFields: { key: string; label: string; value: string }[] = [];

  // Only when it adds something: a card named after its own company ("Hobart
  // Capital" at Hobart Capital) showed the name twice and squeezed the
  // company name next to the logo into "Hobart…".
  if (card.label && !sameName(card.label, card.company)) {
    headerFields.push({ key: "card", label: "CARD", value: card.label });
  }
  if (card.website) secondaryFields.push({ key: "website", label: "WEBSITE", value: card.website });
  if (card.phone) secondaryFields.push({ key: "phone", label: "PHONE", value: card.phone });
  // EMAIL alone in its row — spacious rather than cramped.
  if (card.email) auxiliaryFields.push({ key: "email", label: "EMAIL", value: card.email });
  // Name and title are pictures in the strip, so they're also here as text
  // for VoiceOver and copying.
  if (card.name) backFields.push({ key: "name", label: "NAME", value: card.name });
  if (card.title) backFields.push({ key: "title", label: "JOB TITLE", value: card.title });
  if (card.company) backFields.push({ key: "company", label: "COMPANY", value: card.company });
  if (card.linkedin_url) backFields.push({ key: "linkedin", label: "LINKEDIN", value: card.linkedin_url });
  if (card.twitter_url) backFields.push({ key: "twitter", label: "X", value: card.twitter_url });
  if (card.instagram_url) backFields.push({ key: "instagram", label: "INSTAGRAM", value: card.instagram_url });
  if (card.facebook_url) backFields.push({ key: "facebook", label: card.facebook_is_page ? "FACEBOOK PAGE" : "FACEBOOK", value: card.facebook_url });
  if (card.tiktok_url) backFields.push({ key: "tiktok", label: "TIKTOK", value: card.tiktok_url });
  backFields.push({ key: "view", label: "VIEW ONLINE", value: shareURL });

  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_IDENTIFIER,
    teamIdentifier: TEAM_IDENTIFIER,
    organizationName: "TapCard",
    serialNumber: card.id,
    description: `${card.name || "TapCard"}'s ${card.label ? card.label.toLowerCase() : "business"} card`,
    // Business cards use the same near-black as the public card page and
    // in-app card (#111318); a Personal card uses the brand purple (#422975)
    // so the two are distinguishable at a glance in Wallet. No logoText: the
    // company name is part of the header logo image. No groupingIdentifier:
    // Wallet only groups boarding passes and event tickets.
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: personal ? "rgb(66, 41, 117)" : "rgb(17, 19, 24)",
    labelColor: personal ? "rgb(221, 214, 254)" : "rgb(196, 165, 255)",
    storeCard: {
      headerFields,
      primaryFields: [],
      secondaryFields,
      auxiliaryFields,
      backFields,
    },
    barcodes: [
      {
        message: shareURL,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
      },
    ],
  };
}

function extractDomain(website: string): string | null {
  try {
    const prefixed = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    const host = new URL(prefixed).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/// A company card's uploaded logo (TapCard for Business), else the
/// company's own icon from its website (lib/siteIcon), or null.
async function companyIcon(card: TapCardRecord): Promise<Buffer | null> {
  const orgLogo = await orgLogoBytesForCard(card);
  if (orgLogo) return orgLogo;
  const domain = card.website ? extractDomain(card.website) : null;
  if (!domain) return null;
  // sharp can't decode .ico, so ask for a PNG/JPEG/WebP/GIF.
  return (await findSiteIcon(domain, { allowIco: false }))?.bytes ?? null;
}

/// Picture at 3x, plus the 2x and 1x copies Wallet expects.
async function scaled(base: Buffer, name: string, width1x: number, height1x: number): Promise<Record<string, Buffer>> {
  const [one, two] = await Promise.all([
    sharp(base).resize(width1x, height1x).png().toBuffer(),
    sharp(base).resize(width1x * 2, height1x * 2).png().toBuffer(),
  ]);
  return { [`${name}.png`]: one, [`${name}@2x.png`]: two, [`${name}@3x.png`]: base };
}

async function loadPassAssets(): Promise<Record<string, Buffer>> {
  const dir = path.join(process.cwd(), "lib/tapcardPassAssets");
  const filenames = ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png", "logo@3x.png"];
  const entries = await Promise.all(
    filenames.map(async (name) => [name, await fs.readFile(path.join(dir, name))] as const)
  );
  return Object.fromEntries(entries);
}

function sha1Hex(buffer: Buffer): string {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

/// PKCS#7 detached signature over manifest.json, per Apple's pass signing
/// spec — the .p12's certificate + private key sign it, with the WWDR
/// intermediate certificate included so devices can verify the chain.
function signManifest(manifestBuffer: Buffer): Buffer {
  const { cert, key, wwdr } = loadCredentials();

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestBuffer.toString("binary"));
  p7.addCertificate(cert);
  p7.addCertificate(wwdr);
  // @types/node-forge's signer/attribute types don't quite match what forge
  // accepts at runtime (a forge private key object, and a Date for
  // signingTime) — both work fine in practice, hence the casts.
  p7.addSigner({
    key: key as unknown as string,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, "binary");
}

export async function buildPkpass(card: TapCardRecord, shareURL: string): Promise<Buffer> {
  const assets = await loadPassAssets();
  const passJsonBuffer = Buffer.from(JSON.stringify(buildPassJson(card, shareURL)), "utf-8");

  const files: Record<string, Buffer> = { "pass.json": passJsonBuffer, ...assets };

  const icon = await companyIcon(card);
  // Lock-screen/notification icon: the company icon when there is one, on
  // white (favicons are often a dark glyph on transparency); otherwise the
  // bundled TapCard icon already in `files`.
  if (icon) {
    const square = await sharp(icon).resize(87, 87, { fit: "contain", background: "#fff" }).flatten({ background: "#fff" }).png().toBuffer();
    Object.assign(files, await scaled(square, "icon", 29, 29));
  }

  // Header logo (up to 160x50 pt) and the strip (375x144 pt), drawn at 3x.
  const [lockup, strip] = await Promise.all([
    renderLogoLockup(card, icon, 150),
    renderBanner(card, { width: 1125, height: 432, withText: true }),
  ]);
  const lockupWidth1x = Math.round(((await sharp(lockup).metadata()).width ?? 480) / 3);
  Object.assign(files, await scaled(lockup, "logo", lockupWidth1x, 50), await scaled(strip, "strip", 375, 144));

  const manifest: Record<string, string> = {};
  for (const [name, buffer] of Object.entries(files)) {
    manifest[name] = sha1Hex(buffer);
  }
  const manifestBuffer = Buffer.from(JSON.stringify(manifest), "utf-8");
  const signatureBuffer = signManifest(manifestBuffer);

  const zip = new JSZip();
  for (const [name, buffer] of Object.entries(files)) {
    zip.file(name, buffer);
  }
  zip.file("manifest.json", manifestBuffer);
  zip.file("signature", signatureBuffer);

  return zip.generateAsync({ type: "nodebuffer" });
}
