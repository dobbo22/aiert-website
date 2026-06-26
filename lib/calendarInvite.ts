function formatDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildAnniversaryIcs(): string {
  // 30 Aug 2026, 6:00pm–11:00pm Europe/London (BST, UTC+1) -> 17:00–22:00 UTC
  const start = new Date("2026-08-30T17:00:00Z");
  const end = new Date("2026-08-30T22:00:00Z");
  const now = formatDate(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Martin & Karen Dobson//Anniversary Invite//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:anniversary-dobson-2026@aiert.co.uk`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    "SUMMARY:Martin & Karen's 25th Wedding Anniversary Dinner",
    "DESCRIPTION:Black Tie dinner celebrating Martin & Karen's 25th Wedding Anniversary.",
    "LOCATION:River Room, One Whitehall Place, London SW1A 2EJ",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export const VENUE_MAP_URL = "https://maps.app.goo.gl/ZRLAxXVy1z1ZkV5a6";
