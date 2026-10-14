// Business-card extras: booking / menu / shop links, opening hours and custom rows.
// Stored as JSON text on tapcard_cards.links. Only "Business" cards (and company cards)
// keep them; a Personal card always has none.

export type LinkKind = "book_table" | "book_room" | "appointment" | "menu" | "shop" | "order" | "hours" | "reviews" | "tripadvisor" | "google_review" | "custom";

export interface CardLink {
  kind: LinkKind;
  label: string;
  value: string;
}

export const MAX_CARD_LINKS = 10;

// text-only kinds are shown as text (not a tappable link).
const TEXT_KINDS: LinkKind[] = ["hours"];
const KINDS: LinkKind[] = ["book_table", "book_room", "appointment", "menu", "shop", "order", "hours", "reviews", "tripadvisor", "google_review", "custom"];
const DEFAULT_LABELS: Record<LinkKind, string> = {
  book_table: "Book a table",
  book_room: "Book a room",
  appointment: "Book an appointment",
  menu: "View our menu",
  shop: "Shop online",
  order: "Order online",
  hours: "Opening hours",
  reviews: "Leave a review",
  tripadvisor: "Review us on Tripadvisor",
  google_review: "Review us on Google",
  custom: "More",
};

export function isBusinessLabel(label: string | undefined | null): boolean {
  // Card names are free text; only the "Personal" card is excluded.
  return (label ?? "").trim().toLowerCase() !== "personal";
}

function looksLikeUrl(v: string): boolean {
  return /^https?:\/\//i.test(v) || (/^[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(v) && !v.includes(" "));
}

export function sanitizeLinks(raw: unknown): CardLink[] {
  if (!Array.isArray(raw)) return [];
  const out: CardLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const kind = KINDS.includes(r.kind as LinkKind) ? (r.kind as LinkKind) : "custom";
    let value = typeof r.value === "string" ? r.value.trim().slice(0, 300) : "";
    if (!value) continue;
    const label = (typeof r.label === "string" ? r.label.trim().slice(0, 40) : "") || DEFAULT_LABELS[kind];
    if (!TEXT_KINDS.includes(kind) && looksLikeUrl(value) && !/^https?:\/\//i.test(value)) value = `https://${value}`;
    out.push({ kind, label, value });
    if (out.length >= MAX_CARD_LINKS) break;
  }
  return out;
}

export function parseStoredLinks(stored: string | null | undefined): CardLink[] {
  try {
    return sanitizeLinks(JSON.parse(stored || "[]"));
  } catch {
    return [];
  }
}

export function isTapLink(link: CardLink): boolean {
  return /^https?:\/\//i.test(link.value) && !TEXT_KINDS.includes(link.kind);
}

export type LinkIcon = "calendar" | "menu" | "bag" | "clock" | "star" | "link";
export function linkIcon(kind: LinkKind): LinkIcon {
  switch (kind) {
    case "book_table": case "book_room": case "appointment": return "calendar";
    case "menu": return "menu";
    case "shop": case "order": return "bag";
    case "hours": return "clock";
    case "reviews": case "tripadvisor": case "google_review": return "star";
    default: return "link";
  }
}

// "Call me" on a person's card; "Call us" on a business card; "Call to book" when the business has a menu or
// hours but no online booking, so the phone number is the way to book.
export function callActionLabel(links: { kind: string }[]): string {
  const kinds = new Set(links.map((l) => l.kind));
  const bizKinds = ["book_table", "book_room", "appointment", "menu", "order", "shop", "hours", "reviews", "tripadvisor", "google_review"];
  if (!bizKinds.some((k) => kinds.has(k))) return "Call me";
  const canBook = kinds.has("book_table") || kinds.has("book_room") || kinds.has("appointment");
  return !canBook && (kinds.has("menu") || kinds.has("hours")) ? "Call to book" : "Call us";
}
