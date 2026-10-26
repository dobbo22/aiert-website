// Which web and email domains belong to a business itself (as opposed to Gmail, a social page or a website builder).
// Used by verification (lib/tapcardVerify.ts) and by TapCard for Business sign-up (lib/tapcardBiz.ts).

// Websites that are not a business's own domain: a code to one of these addresses proves nothing about the business.
const NOT_OWN_DOMAIN = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "yahoo.com", "yahoo.co.uk", "icloud.com", "me.com",
  "btinternet.com", "btopenworld.com", "sky.com", "aol.com", "proton.me", "protonmail.com",
  "facebook.com", "fb.com", "instagram.com", "linktr.ee", "linkedin.com", "twitter.com", "x.com", "tiktok.com", "youtube.com", "google.com",
  "wixsite.com", "wordpress.com", "squarespace.com", "weebly.com", "godaddysites.com", "business.site", "sites.google.com", "carrd.co",
  "ubereats.com", "just-eat.co.uk", "deliveroo.co.uk", "opentable.com", "tripadvisor.co.uk", "tripadvisor.com", "yell.com", "yelp.com",
]);
const SECOND_LEVEL = new Set(["co.uk", "org.uk", "me.uk", "ltd.uk", "plc.uk", "gov.uk", "ac.uk", "sch.uk", "com.au", "co.nz", "co.za", "com.br", "co.in", "co.jp"]);

/// The domain a website belongs to ("www.maguro-restaurant.com" -> "maguro-restaurant.com"), or "" when it is missing or is not a
/// business's own domain (a social page, a free-mail address, a website-builder subdomain).
export function businessDomain(website: string): string {
  let host = "";
  try {
    host = new URL(/^[a-z]+:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`).hostname.toLowerCase();
  } catch { return ""; }
  host = host.replace(/^www\./, "");
  const parts = host.split(".");
  if (parts.length < 2) return "";
  const two = parts.slice(-2).join(".");
  const reg = SECOND_LEVEL.has(two) && parts.length >= 3 ? parts.slice(-3).join(".") : two;
  if (NOT_OWN_DOMAIN.has(reg) || NOT_OWN_DOMAIN.has(host)) return "";
  return reg;
}


/// True for a free-mail or other shared domain (gmail.com, outlook.com...): an address there says nothing about which business it is.
export function isFreeMailDomain(domain: string): boolean {
  return !businessDomain(domain.trim().toLowerCase());
}

/// Does this email address sit on (or under) the given business domain?
export function emailOnDomain(email: string, domain: string): boolean {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  return !!domain && !!d && (d === domain || d.endsWith(`.${domain}`));
}
