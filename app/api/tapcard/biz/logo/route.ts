import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { getOrg, setOrgLogo } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { findSiteLogo, normalizeDomain } from "@/lib/siteIcon";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

// The company logo on every employee's card (template page). Either an
// uploaded file (multipart "logo") or { fromWebsite: true } to pull it from
// the org's website (lib/siteIcon findSiteLogo). Stored in Vercel Blob like
// card photos; replacing or removing deletes the old file.
export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Blob;
  let contentType: string;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const file = (await req.formData()).get("logo");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    if (!LOGO_TYPES.includes(file.type) || file.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: "The logo must be a PNG, JPEG or WebP under 2 MB." }, { status: 400 });
    }
    body = file;
    contentType = file.type;
  } else {
    const domain = websiteDomain(org.website);
    if (!domain) {
      return NextResponse.json({ error: "Add your website above (and save) first." }, { status: 400 });
    }
    const logo = await findSiteLogo(domain).catch(() => null);
    if (!logo) {
      return NextResponse.json({ error: `Couldn't find a logo on ${domain} — upload one instead.` }, { status: 404 });
    }
    body = new Blob([new Uint8Array(logo.bytes)], { type: logo.contentType });
    contentType = logo.contentType;
  }

  const blob = await put(`tapcard-biz/${org.id}-logo-${Date.now()}`, body, { access: "public", contentType });
  await setOrgLogo(org.id, blob.url);
  if (org.logo_url) await del(org.logo_url).catch(() => {});
  return NextResponse.json({ url: blob.url });
}

export async function DELETE() {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });

  await setOrgLogo(org.id, null);
  if (org.logo_url) await del(org.logo_url).catch(() => {});
  return NextResponse.json({ ok: true });
}

function websiteDomain(website: string): string | null {
  try {
    const host = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname;
    return normalizeDomain(host);
  } catch {
    return null;
  }
}
