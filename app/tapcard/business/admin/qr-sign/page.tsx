import { requireBizUser } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { listLocations, parseSign } from "@/lib/tapcardBizLocations";
import QrSignEditor from "./QrSignEditor";

export const metadata = { title: "QR sign — TapCard for Business", robots: { index: false, follow: false } };

// A printable counter or window sign for each shop: headline, the shop's QR code (its own card link once its manager has made the
// card; a sample until then) and options. Wording is saved per shop; printing is from the browser (Print, or Save as PDF).
export default async function QrSignPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const session = await requireBizUser();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const { shop } = await searchParams;
  const all = await listLocations(org.id).catch(() => []);
  // A manager sees only their own shops.
  const locations = session.role === "manager" ? all.filter((l) => session.locationIds.includes(l.id)) : all;
  // The sign's QR code is the shop's own card, so setup has to be finished first: company details, every shop added, every card made.
  const waiting = locations.filter((l) => !l.claimed_card_id);
  const allowed = org.seat_band === "locations" ? Math.max(org.locations, 1) : 1;
  const todo: { text: string; href: string }[] = [];
  if (session.role === "admin") {
    if (!org.website || !org.logo_url) todo.push({ text: "Set up your company details", href: "/business/admin/template" });
    if (locations.length < allowed) todo.push({ text: `Add your shops (${locations.length} of ${allowed})`, href: "/business/admin/locations" });
  }
  if (locations.length === 0 && session.role === "manager") todo.push({ text: "No shop is assigned to you yet; ask your admin", href: "/business/admin" });
  if (waiting.length > 0) {
    todo.push({
      text: `Each shop's card must be made first: ${waiting.map((l) => l.name).join(", ")} ${waiting.length === 1 ? "is" : "are"} still waiting for the manager to open their invite link in the TapCard app`,
      href: session.role === "admin" ? "/business/admin/locations" : "/business/admin",
    });
  }
  if (todo.length > 0) {
    return (
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
        <h2 className="text-lg font-bold text-cloud">Finish setting up your card before making a QR sign</h2>
        <p className="mt-2 text-cloud">The QR code on the sign is your shop&apos;s own TapCard, so it can&apos;t be made until these are done:</p>
        <ul className="mt-3 space-y-2 text-cloud">
          {todo.map((t) => (
            <li key={t.text} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate text-sm font-bold text-cloud">!</span>
              <a href={t.href} className="text-gold underline">{t.text}</a></li>
          ))}
        </ul>
      </div>
    );
  }
  const shops = locations.map((l) => {
    const parts = l.address.split(",").map((p) => p.replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, "").trim()).filter(Boolean);
    return {
      id: l.id, name: l.name, town: (parts.length >= 2 ? parts[1] : parts[0]) || l.name, address: l.address,
      cardUrl: l.claimed_card_id ? `https://tapcard.aiert.co.uk/c/${l.claimed_card_id}` : null, sign: parseSign(l.sign),
    };
  });
  return (
    <QrSignEditor
      shops={shops}
      selected={shops.find((s) => s.id === shop)?.id ?? shops[0]?.id ?? null}
      company={{
        name: org.name, website: org.website, logoUrl: org.logo_url,
        socials: [["LinkedIn", org.linkedin_url], ["X", org.twitter_url], ["Instagram", org.instagram_url], ["Facebook", org.facebook_url], ["TikTok", org.tiktok_url]].filter(([, u]) => u) as [string, string][],
      }}
    />
  );
}
