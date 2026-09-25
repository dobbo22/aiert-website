import forge from "node-forge";
import JSZip from "jszip";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { TapCardRecord } from "@/lib/tapcardDb";

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
  // Standard Wallet generic-pass grid: company in the header (top-right,
  // alongside the logo), name as the prominent headline, then a proper
  // two-column WEBSITE/PHONE row, TITLE/EMAIL below that, matching the
  // reference layout — small caps labels above each value, not the
  // label-less version tried previously.
  const headerFields: { key: string; label: string; value: string }[] = [];
  const secondaryFields: { key: string; label: string; value: string }[] = [];
  const auxiliaryFields: { key: string; label: string; value: string }[] = [];
  const backFields: { key: string; label: string; value: string }[] = [];

  if (card.company) headerFields.push({ key: "company", label: "COMPANY", value: card.company });
  if (card.website) secondaryFields.push({ key: "website", label: "WEBSITE", value: card.website });
  if (card.phone) secondaryFields.push({ key: "phone", label: "PHONE", value: card.phone });
  // EMAIL alone, not sharing its row with TITLE — the reference layout
  // shows just one field in that row, spacious rather than cramped. Title
  // still lives on the back of the pass rather than being dropped outright.
  if (card.email) auxiliaryFields.push({ key: "email", label: "EMAIL", value: card.email });
  if (card.title) backFields.push({ key: "title", label: "TITLE", value: card.title });
  if (card.linkedin_url) backFields.push({ key: "linkedin", label: "LINKEDIN", value: card.linkedin_url });
  if (card.twitter_url) backFields.push({ key: "twitter", label: "X", value: card.twitter_url });
  if (card.instagram_url) backFields.push({ key: "instagram", label: "INSTAGRAM", value: card.instagram_url });
  if (card.facebook_url) backFields.push({ key: "facebook", label: "FACEBOOK", value: card.facebook_url });
  if (card.tiktok_url) backFields.push({ key: "tiktok", label: "TIKTOK", value: card.tiktok_url });
  backFields.push({ key: "view", label: "VIEW ONLINE", value: shareURL });

  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_IDENTIFIER,
    teamIdentifier: TEAM_IDENTIFIER,
    organizationName: "TapCard",
    serialNumber: card.id,
    description: `${card.name || "TapCard"}'s ${card.label ? card.label.toLowerCase() : "business"} card`,
    foregroundColor: "rgb(226, 232, 240)",
    backgroundColor: "rgb(11, 15, 26)",
    labelColor: "rgb(196, 165, 255)",
    // No logoText — the logo image itself is now the company's own favicon
    // (see buildLogo), which sits in the same header row as the COMPANY
    // field, so the two already read as "favicon next to company name"
    // without needing any text label here.
    // Passes sharing the same passTypeIdentifier + groupingIdentifier get
    // visually stacked together in Wallet (the same mechanism used for
    // connecting-flight boarding passes) — so a device's Business and
    // Personal pass appear as a related set, not two unrelated entries.
    ...(card.grouping_id ? { groupingIdentifier: card.grouping_id } : {}),
    generic: {
      headerFields,
      primaryFields: card.name ? [{ key: "name", label: "NAME", value: card.name }] : [],
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

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
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

/// The pass's logo image (top-left, same header row as the COMPANY field)
/// — the company's own favicon when the card has a website, so it reads as
/// "favicon next to company name"; falls back to TapCard's own static logo
/// (lib/tapcardPassAssets) when there's no website to resolve one from.
/// Square, not circular — Wallet's logo slot renders as a plain rect (only
/// thumbnailImage needs a manual circular mask), matching how the static
/// fallback logo was built (lib/tapcardPassAssets, via `sips -Z`).
async function buildCompanyLogo(card: TapCardRecord): Promise<Buffer | null> {
  const domain = card.website ? extractDomain(card.website) : null;
  if (!domain) return null;
  const faviconBuffer = await fetchImageBuffer(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
  if (!faviconBuffer) return null;
  // White background — favicons are often a dark glyph on transparency,
  // which would otherwise vanish against the pass's own dark background.
  return sharp(faviconBuffer).resize(128, 128, { fit: "contain", background: "#fff" }).flatten({ background: "#fff" }).png().toBuffer();
}

/// Just the profile photo, cropped to a circle — Wallet's thumbnailImage
/// renders exactly the pixels given (no automatic circular mask the way an
/// avatar view does), so the mask has to be applied here for the clean
/// circular photo the reference layout shows. (An earlier version also
/// merged in the company favicon side-by-side via a hand-built SVG; dropped
/// after the reference layout the user pointed at showed a single plain
/// photo, and it had already been the source of three separate bugs for a
/// secondary flourish.)
async function buildThumbnail(card: TapCardRecord): Promise<Buffer | null> {
  if (!card.photo_url) return null;
  const photoBufferRaw = await fetchImageBuffer(card.photo_url);
  if (!photoBufferRaw) return null;

  const size = 300;
  const squared = await sharp(photoBufferRaw).resize(size, size, { fit: "cover" }).png().toBuffer();
  const circleMask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);

  return sharp(squared)
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();
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

  // Company favicon overrides the static TapCard logo AND icon when
  // resolvable — falls back to the bundled assets already in `files` (from
  // loadPassAssets) if there's no website or the favicon fetch fails. icon
  // is what Wallet uses for notifications/lock-screen/Watch contexts, not
  // just the visible header logo — both were still showing TapCard's own
  // branding until now.
  const companyLogo = await buildCompanyLogo(card);
  if (companyLogo) {
    const [logo1x, logo2x, logo3x, icon1x, icon2x, icon3x] = await Promise.all([
      sharp(companyLogo).resize(50, 50).png().toBuffer(),
      sharp(companyLogo).resize(100, 100).png().toBuffer(),
      sharp(companyLogo).resize(150, 150).png().toBuffer(),
      sharp(companyLogo).resize(29, 29).png().toBuffer(),
      sharp(companyLogo).resize(58, 58).png().toBuffer(),
      sharp(companyLogo).resize(87, 87).png().toBuffer(),
    ]);
    files["logo.png"] = logo1x;
    files["logo@2x.png"] = logo2x;
    files["logo@3x.png"] = logo3x;
    files["icon.png"] = icon1x;
    files["icon@2x.png"] = icon2x;
    files["icon@3x.png"] = icon3x;
  }

  // thumbnail.png (+ @2x/@3x) is picked up by Wallet purely by filename
  // convention, same as icon/logo — no pass.json field needed. Skipped
  // entirely when there's neither a photo nor a resolvable favicon.
  const thumbnailBase = await buildThumbnail(card);
  if (thumbnailBase) {
    const [thumb1x, thumb2x, thumb3x] = await Promise.all([
      sharp(thumbnailBase).resize(90, 90).png().toBuffer(),
      sharp(thumbnailBase).resize(180, 180).png().toBuffer(),
      sharp(thumbnailBase).resize(270, 270).png().toBuffer(),
    ]);
    files["thumbnail.png"] = thumb1x;
    files["thumbnail@2x.png"] = thumb2x;
    files["thumbnail@3x.png"] = thumb3x;
  }

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
