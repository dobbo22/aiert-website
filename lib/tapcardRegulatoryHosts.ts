// Third-party regulatory news and market-data sites. TapCard sends a headline with a link to the announcement on the company's OWN
// website. It never reads, links to or aggregates the London Stock Exchange's RNS or a service that republishes it (that is a licensed
// redistribution business, and the contracts say TapCard is not one). Match is on the host and its subdomains. Add to the list freely.
export const THIRD_PARTY_REGULATORY_HOSTS = [
  "londonstockexchange.com",
  "lse.co.uk",
  "investegate.co.uk",
  "advfn.com",
  "marketscreener.com",
  "proactiveinvestors.co.uk",
  "proactiveinvestors.com",
  "sharecast.com",
  "morningstar.co.uk",
  "hl.co.uk",
  "ii.co.uk",
  "ftadviser.com",
  "reuters.com",
  "rns-pdf.londonstockexchange.com",
];

export function isThirdPartyRegulatoryUrl(raw: string): boolean {
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    const h = u.hostname.toLowerCase().replace(/\.$/, "");
    return THIRD_PARTY_REGULATORY_HOSTS.some((d) => h === d || h.endsWith("." + d));
  } catch { return false; }
}

export const THIRD_PARTY_MESSAGE =
  "TapCard only links to announcements on your company's own website. It does not link to or read the London Stock Exchange's RNS or other regulatory news sites.";
