import { appleMapsQuery } from "@/lib/mapsQuery";
import type { Metadata } from "next";
import { headers } from "next/headers";
import sql from "@/lib/db";
import { ensureMailshotSchema } from "@/lib/mailshot";
import { isBotUserAgent } from "@/lib/tapcardInvites";
import { isMkToken, previewLeadByToken, recordPreviewOpened } from "@/lib/marketing";
import PreviewEngage from "./PreviewEngage";

export const metadata: Metadata = { title: "Your TapCard preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const HOURS = 24;
const MAX_DAYS_AFTER_SEND = 7;

interface Row {
  sent_at: string;
  preview_first_at: string | null;
  name: string;
  company: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  booking_url: string | null;
  menu_url: string | null;
}

function host(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, ""); } catch { return null; }
}
const web = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

function mapsUrl(address: string, ua: string, place = ""): string {
  const a = address.trim();
  const named = place.trim() && !a.toLowerCase().includes(place.trim().toLowerCase()) ? `${place.trim()}, ${a}` : a;
  const q = encodeURIComponent(/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(a) ? `${a}, UK` : named);
  if (/iPhone|iPad|iPod/i.test(ua)) return `https://maps.apple.com/?q=${encodeURIComponent(appleMapsQuery(a, place))}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// A restaurant's own TapCard, made for it, to see it working: tap to call, book, see the menu, get directions.
// It is a preview: it can't post offers, can't be edited or shared as a TapCard, and ends 24 hours after the
// restaurant first opens it (and 7 days after the email, whichever comes first).
export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ua = (await headers()).get("user-agent") ?? "";
  const mk = isMkToken(token);
  if (!mk) await ensureMailshotSchema();
  const row = mk
    ? ((await previewLeadByToken(token).catch(() => null)) as Row | null) ?? undefined
    : ((await sql`
    SELECT s.sent_at, s.preview_first_at, c.name, c.company, c.phone, c.website, c.address, c.booking_url, c.menu_url
    FROM tapcard_invite_sends s JOIN tapcard_invite_contacts c ON c.id = s.contact_id
    WHERE s.token = ${token}
  `) as Row[])[0];

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-6 text-white ring-1 ring-white/10">{children}</div>
    </main>
  );
  const getApp = (
    <a href={mk ? `/mk/${token}` : `/i/${token}`} className="mt-5 block rounded-xl bg-white px-4 py-3 text-center font-semibold text-[#111318]">Get TapCard</a>
  );

  if (!row) return shell(<p className="text-center">This preview link isn&apos;t valid.</p>);

  const now = Date.now();
  const sentAt = new Date(row.sent_at).getTime();
  let first = row.preview_first_at ? new Date(row.preview_first_at).getTime() : null;
  if (first === null && !isBotUserAgent(ua)) {
    // Link scanners don't start the clock; the first real visit does.
    if (mk) await recordPreviewOpened(token).catch(() => {});
    else await sql`UPDATE tapcard_invite_sends SET preview_first_at = now() WHERE token = ${token} AND preview_first_at IS NULL`;
    first = now;
  }
  const endsAt = Math.min((first ?? now) + HOURS * 3600_000, sentAt + MAX_DAYS_AFTER_SEND * 86_400_000);
  if (now > endsAt) {
    return shell(
      <>
        <h1 className="text-xl font-bold text-center">This preview has ended</h1>
        <p className="mt-3 text-center text-white/90">It was a 24-hour preview of {row.name}&apos;s TapCard. Get TapCard to make it yours.</p>
        {getApp}
      </>,
    );
  }

  const domain = host(row.website);
  const rows: { color: string; label: string; value: string; href: string }[] = [];
  if (row.phone) rows.push({ color: "#22c55e", label: "Call us", value: row.phone, href: `tel:${row.phone.replace(/\s+/g, "")}` });
  if (row.booking_url || domain) rows.push({ color: "#0e8c99", label: "Book a table", value: host(row.booking_url) ?? domain ?? "", href: web(row.booking_url || row.website || "") });
  if (row.menu_url || domain) rows.push({ color: "#0e8c99", label: "View our menu", value: host(row.menu_url) ?? domain ?? "", href: web(row.menu_url || row.website || "") });
  if (domain) rows.push({ color: "#3b82f6", label: "Visit our site", value: domain, href: web(row.website ?? "") });
  if (row.address) rows.push({ color: "#ef4444", label: "Get directions", value: row.address, href: mapsUrl(row.address, ua, row.company ?? "") });
  const ends = new Date(endsAt).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "2-digit", minute: "2-digit" });

  return shell(
    <>
      <p className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm">
        A preview made for {row.name}. It stays live until <strong>{ends}</strong>. Try the buttons below.
      </p>
      <div className="mt-5 rounded-3xl bg-gradient-to-b from-[#3b2a6b] to-[#16171c] p-4">
        <div className="flex justify-center">
          {domain ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/logo?domain=${encodeURIComponent(domain)}`} alt="" width={96} height={96} className="h-24 w-24 rounded-full border-4 border-[#0b0c10] bg-white object-contain p-2" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#0b0c10] bg-[#3a3b42] text-3xl font-bold">
              {row.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="mt-3 text-center text-2xl font-bold">{row.name}</h1>
        {row.company && row.company !== row.name ? <p className="text-center text-white/90">{row.company}</p> : null}
        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <a key={r.label} href={r.href} data-label={r.label} className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3">
              <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: r.color }} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className="block truncate text-sm text-white/90">{r.value}</span>
              </span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-white/80">TapCard from AIERT</p>
      </div>
      <p className="mt-5 text-center text-sm text-white/90">
        This is how your customers would see you after scanning your QR code. With TapCard Promote you could also post offers and news, with 3 months free.
      </p>
      {getApp}
      {mk ? <PreviewEngage token={token} /> : null}
    </>,
  );
}
