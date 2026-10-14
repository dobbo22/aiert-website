import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";

// The QR code in a restaurant email: scanning it opens that restaurant's 24-hour TapCard preview (/v/<token>).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) return new Response("Bad token", { status: 400 });
  const qr = await QRCode.toBuffer(`https://tapcard.aiert.co.uk/v/${token}`, { errorCorrectionLevel: "H", margin: 2, width: 420, type: "png" });
  let png = qr;
  try {
    const icon = await readFile(path.join(process.cwd(), "public", "tapcard-icon.png"));
    const tile = Math.round(420 * 0.24);
    const inner = Math.round(tile * 0.84);
    const tileSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}"><rect width="${tile}" height="${tile}" rx="${Math.round(tile * 0.22)}" fill="#fff"/></svg>`);
    const roundMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${inner}" height="${inner}"><rect width="${inner}" height="${inner}" rx="${Math.round(inner * 0.22)}" fill="#fff"/></svg>`);
    const small = await sharp(icon).resize(inner, inner).composite([{ input: roundMask, blend: "dest-in" }]).png().toBuffer();
    const left = Math.round((420 - tile) / 2);
    png = await sharp(qr).composite([
      { input: tileSvg, left, top: left },
      { input: small, left: left + Math.round((tile - inner) / 2), top: left + Math.round((tile - inner) / 2) },
    ]).png().toBuffer();
  } catch {
    // no icon file: the plain QR code still works
  }
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
