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
  if (card.title) auxiliaryFields.push({ key: "title", label: "TITLE", value: card.title });
  if (card.email) auxiliaryFields.push({ key: "email", label: "EMAIL", value: card.email });
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
