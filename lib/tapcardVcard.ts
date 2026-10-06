// RFC 6350 §3.4: backslash, comma, semicolon and newline are the characters
// that need escaping in a text value.
function escapeVCardText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

/// Just the fields buildVCard actually reads — a TapCardRecord satisfies
/// this structurally, but it also lets app/api/tapcard/vcard-preview build
/// a vCard from loose form fields (no stored card, no id) without widening
/// TapCardRecord itself.
export interface VCardFields {
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  whatsapp_url?: string;
  photo_url?: string | null;
}

export function buildVCard(card: VCardFields): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];

  if (card.name) {
    lines.push(`FN:${escapeVCardText(card.name)}`);
    // No separate given/family name entry from users — N is required by
    // some importers, so fall back to putting the whole name in the
    // "given name" slot rather than guessing a split that's often wrong
    // for non-Western names.
    lines.push(`N:;${escapeVCardText(card.name)};;;`);
  }
  if (card.title) lines.push(`TITLE:${escapeVCardText(card.title)}`);
  if (card.company) lines.push(`ORG:${escapeVCardText(card.company)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${escapeVCardText(card.phone)}`);
  if (card.email) lines.push(`EMAIL:${escapeVCardText(card.email)}`);
  if (card.website) lines.push(`URL:${escapeVCardText(card.website)}`);
  // ADR's structured fields (street;locality;region;postcode;country) don't
  // map cleanly onto the single flattened string this app stores — putting
  // it all in the "street" slot is what every contacts app actually shows
  // regardless, so nothing is lost by not splitting it back apart.
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCardText(card.address)};;;;`);
  if (card.linkedin_url) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${escapeVCardText(card.linkedin_url)}`);
  if (card.twitter_url) lines.push(`X-SOCIALPROFILE;TYPE=twitter:${escapeVCardText(card.twitter_url)}`);
  if (card.instagram_url) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${escapeVCardText(card.instagram_url)}`);
  if (card.facebook_url) lines.push(`X-SOCIALPROFILE;TYPE=facebook:${escapeVCardText(card.facebook_url)}`);
  if (card.tiktok_url) lines.push(`X-SOCIALPROFILE;TYPE=tiktok:${escapeVCardText(card.tiktok_url)}`);
  if (card.whatsapp_url) lines.push(`X-SOCIALPROFILE;TYPE=whatsapp:${escapeVCardText(card.whatsapp_url)}`);
  if (card.photo_url) lines.push(`PHOTO;VALUE=URL:${escapeVCardText(card.photo_url)}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}
