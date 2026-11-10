// What a business's own website tells us, to prefill a card made in the App Clip: the company name, the address and phone,
// its social profiles and its opening hours. Read-only and public: it only reads the site's own home page (through the same
// safe fetch the card builder uses), and stores nothing.
import { findSiteLinks } from "@/lib/siteLinks";
import { fetchHomePage, normalizeDomain, readLimited } from "@/lib/siteIcon";

export interface SiteDetailsReply {
  name: string; address: string; phone: string;
  facebook: string; instagram: string; twitter: string; linkedin: string; tiktok: string; hours: string;
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#8211;|&ndash;/g, "-").replace(/\s+/g, " ").trim();

/// The site's own name: og:site_name, else the first part of the <title> ("Hobart Capital | Stockbrokers" gives "Hobart Capital").
export async function siteName(website: string): Promise<string> {
  const domain = normalizeDomain(website);
  if (!domain) return "";
  const page = await fetchHomePage(domain).catch(() => null);
  if (!page || !(page.res.headers.get("content-type") ?? "").includes("text/html")) return "";
  const buf = await readLimited(page.res, 400 * 1024);
  if (!buf) return "";
  const html = buf.toString("utf8");
  const og = /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,80})["']/i.exec(html) ?? /<meta[^>]+content=["']([^"']{2,80})["'][^>]+property=["']og:site_name["']/i.exec(html);
  if (og) return decode(og[1]);
  const title = /<title[^>]*>([^<]{2,200})<\/title>/i.exec(html)?.[1];
  if (!title) return "";
  const first = decode(title).split(/\s+[|\-–—·:]\s+/)[0].trim();
  return first.length >= 2 && first.length <= 60 ? first : "";
}

export async function siteDetails(website: string): Promise<SiteDetailsReply> {
  const [found, name] = await Promise.all([findSiteLinks(website).catch(() => null), siteName(website).catch(() => "")]);
  const d = found?.details ?? {};
  // A site with several branches has no single address or phone: leave them for the person to fill in.
  const single = (found?.branches.length ?? 0) <= 1;
  return {
    name,
    address: single ? d.address ?? "" : "",
    phone: single ? d.phone ?? "" : "",
    facebook: d.facebook ?? "", instagram: d.instagram ?? "", twitter: d.twitter ?? "", linkedin: d.linkedin ?? "", tiktok: d.tiktok ?? "",
    hours: single ? found?.links.find((l) => l.kind === "hours")?.value ?? "" : "",
  };
}
