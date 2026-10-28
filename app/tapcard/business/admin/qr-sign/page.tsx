import { requireBizUser } from "@/lib/tapcardBizSession";
import { getOrg, listOrgCards } from "@/lib/tapcardBiz";
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
  // The sign needs one card to exist (the first admin's, made at sign-up). A shop's own card is used once its manager has made it; until
  // then the sign carries the company's first card, so managers can be added afterwards.
  const cards = await listOrgCards(org.id).catch(() => []);
  const firstCard = cards[cards.length - 1];
  if (!firstCard) {
    return (
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
        <h2 className="text-lg font-bold text-cloud">Make your card before making a QR sign</h2>
        <p className="mt-2 text-cloud">The QR code on the sign is a TapCard, so one card has to exist first. Open your sign-in email on your phone, install the free TapCard app and make your card. Then come back here.</p>
        <p className="mt-3"><a href="/business/admin" className="text-gold underline">Back to the overview</a></p>
      </div>
    );
  }
  if (session.role === "manager" && locations.length === 0) {
    return <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40"><p className="text-cloud">No shop is assigned to you yet; ask your admin.</p></div>;
  }
  const shops = locations.map((l) => {
    const parts = l.address.split(",").map((p) => p.replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, "").trim()).filter(Boolean);
    return {
      id: l.id, name: l.name, town: (parts.length >= 2 ? parts[1] : parts[0]) || l.name, address: l.address,
      cardUrl: `https://tapcard.aiert.co.uk/c/${l.claimed_card_id ?? firstCard.id}`, sign: parseSign(l.sign),
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
