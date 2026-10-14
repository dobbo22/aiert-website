import sharp from "sharp";

/// Puts a picture (the card) on a phone screen: dark bezel, rounded corners and a speaker slot, on a transparent
/// background — so an email shows "this is on your phone" rather than a flat rectangle.
export async function inPhone(png: Buffer): Promise<Buffer> {
  const meta = await sharp(png).metadata();
  const w = meta.width ?? 600;
  const h = meta.height ?? 1200;
  const bezel = 26;
  const top = 44; // room for the speaker slot
  const outer = 78;
  const inner = outer - bezel + 10;
  const W = w + bezel * 2;
  const H = h + top + bezel;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${inner}" fill="#fff"/></svg>`);
  const screen = await sharp(png).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const body = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${outer}" fill="#0b0c10" stroke="#4b4d57" stroke-width="3"/>` +
      `<rect x="${W / 2 - 60}" y="${top / 2 - 7}" width="120" height="14" rx="7" fill="#26272e"/>` +
    `</svg>`,
  );
  return sharp(body).composite([{ input: screen, left: bezel, top }]).png().toBuffer();
}
