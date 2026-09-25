import type { TapCardRecord } from "@/lib/tapcardDb";

// RFC 6350 §3.4: backslash, comma, semicolon and newline are the characters
// that need escaping in a text value.
function escapeVCardText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildVCard(card: TapCardRecord): string {
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
  if (card.linkedin_url) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${escapeVCardText(card.linkedin_url)}`);
  if (card.twitter_url) lines.push(`X-SOCIALPROFILE;TYPE=twitter:${escapeVCardText(card.twitter_url)}`);
  if (card.instagram_url) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${escapeVCardText(card.instagram_url)}`);
  if (card.facebook_url) lines.push(`X-SOCIALPROFILE;TYPE=facebook:${escapeVCardText(card.facebook_url)}`);
  if (card.tiktok_url) lines.push(`X-SOCIALPROFILE;TYPE=tiktok:${escapeVCardText(card.tiktok_url)}`);
  if (card.photo_url) lines.push(`PHOTO;VALUE=URL:${escapeVCardText(card.photo_url)}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}
