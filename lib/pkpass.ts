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
  const auxiliaryFields: { key: string; label: string; value: string }[] = [];
  const backFields: { key: string; label: string; value: string }[] = [];

  if (card.phone) auxiliaryFields.push({ key: "phone", label: "PHONE", value: card.phone });
  if (card.email) auxiliaryFields.push({ key: "email", label: "EMAIL", value: card.email });
  if (card.website) backFields.push({ key: "website", label: "WEBSITE", value: card.website });
  if (card.linkedin_url) backFields.push({ key: "linkedin", label: "LINKEDIN", value: card.linkedin_url });
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
    // Distinguishes multiple passes for the same person in Wallet's list —
    // without this, a Business and Personal pass both just say "TapCard".
    logoText: card.label ? `TapCard · ${card.label}` : "TapCard",
    // Passes sharing the same passTypeIdentifier + groupingIdentifier get
    // visually stacked together in Wallet (the same mechanism used for
    // connecting-flight boarding passes) — so a device's Business and
    // Personal pass appear as a related set, not two unrelated entries.
    ...(card.grouping_id ? { groupingIdentifier: card.grouping_id } : {}),
    generic: {
      primaryFields: card.name ? [{ key: "name", label: "NAME", value: card.name }] : [],
      secondaryFields: [card.title, card.company].filter(Boolean).length
        ? [{ key: "role", label: "ROLE", value: [card.title, card.company].filter(Boolean).join(" · ") }]
        : [],
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

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/// Composites the company favicon + profile photo into a single square
/// image for the pass's thumbnail slot — mirrors the same "favicon to the
/// left, photo to the right" layout as the in-app card view, since
/// PassKit has no way to place two separate images side by side itself.
/// Built as one SVG (each source image clipped to a circle) rather than
/// raw pixel math — sharp rasterizes SVG natively, which keeps the
/// circular-crop logic simple. Returns null if there's nothing to show
/// (no photo and no resolvable domain) so buildPkpass can skip the
/// thumbnail files entirely rather than shipping blank ones.
async function buildThumbnail(card: TapCardRecord): Promise<Buffer | null> {
  const domain = card.website ? extractDomain(card.website) : null;
  const [photoBufferRaw, faviconBufferRaw] = await Promise.all([
    card.photo_url ? fetchImageBuffer(card.photo_url) : Promise.resolve(null),
    domain ? fetchImageBuffer(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`) : Promise.resolve(null),
  ]);
  if (!photoBufferRaw && !faviconBufferRaw) return null;

  // Normalize both to PNG before embedding — the photo is whatever the
  // uploader's device produced (usually JPEG), and labeling it image/png in
  // the data URI below (an earlier bug) made the SVG renderer silently drop
  // it rather than error, since the bytes didn't match the declared type.
  const [photoBuffer, faviconBuffer] = await Promise.all([
    photoBufferRaw ? sharp(photoBufferRaw).png().toBuffer() : Promise.resolve(null),
    faviconBufferRaw ? sharp(faviconBufferRaw).png().toBuffer() : Promise.resolve(null),
  ]);

  const toDataUri = (buffer: Buffer) => `data:image/png;base64,${buffer.toString("base64")}`;
  const size = 300;
  const cy = size / 2;
  const bothPresent = Boolean(photoBuffer && faviconBuffer);
  // Equal-sized circles with a real gap between them (mirrors the in-app
  // card view's 92pt-avatar / 92pt-favicon / 12pt-gap layout) — the
  // previous radii overlapped the two circles and let the photo one spill
  // past the canvas edge.
  const r = bothPresent ? 70 : 130;
  const faviconCX = bothPresent ? r : size / 2;
  const photoCX = bothPresent ? size - r : size / 2;
  const photoR = r;
  const faviconR = r;

  let svgBody = `<rect width="${size}" height="${size}" fill="none"/>`;
  if (faviconBuffer) {
    svgBody += `
      <clipPath id="favicon-clip"><circle cx="${faviconCX}" cy="${cy}" r="${faviconR}"/></clipPath>
      <circle cx="${faviconCX}" cy="${cy}" r="${faviconR + 4}" fill="white"/>
      <image href="${toDataUri(faviconBuffer)}" x="${faviconCX - faviconR}" y="${cy - faviconR}" width="${faviconR * 2}" height="${faviconR * 2}" clip-path="url(#favicon-clip)" preserveAspectRatio="xMidYMid slice"/>
    `;
  }
  if (photoBuffer) {
    svgBody += `
      <clipPath id="photo-clip"><circle cx="${photoCX}" cy="${cy}" r="${photoR}"/></clipPath>
      <image href="${toDataUri(photoBuffer)}" x="${photoCX - photoR}" y="${cy - photoR}" width="${photoR * 2}" height="${photoR * 2}" clip-path="url(#photo-clip)" preserveAspectRatio="xMidYMid slice"/>
    `;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${svgBody}</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
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
