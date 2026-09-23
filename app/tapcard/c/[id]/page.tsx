import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCard } from "@/lib/tapcardDb";

// TODO: real App Store id once TapCard is live in App Store Connect.
const TAPCARD_APP_STORE_URL = "https://apps.apple.com/app/tapcard";
const MAILBROOM_APP_STORE_URL = "https://apps.apple.com/app/mailbroom/id6744036741";
const POWERSEARCH_APP_STORE_URL = "https://apps.apple.com/us/app/powersearch/id6807772868";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return { title: "Card not found" };

  const title = [card.name, card.title].filter(Boolean).join(" — ") || "TapCard";
  return {
    title,
    description: `${card.name}'s digital business card, made with TapCard.`,
    robots: { index: false, follow: false },
  };
}

// This page is the actual conversion surface for the whole product — see
// the plan's design point that the QR/link always points here rather than
// encoding a raw vCard directly, so strangers see the "Get TapCard" and
// MailBroom/PowerSearch cross-promo before (or alongside) saving the
// contact. Server component: reads straight from Postgres, no client JS
// needed for the core "view a card" path.
export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  const contactLines = [
    { label: card.phone, href: `tel:${card.phone}` },
    { label: card.email, href: `mailto:${card.email}` },
    { label: card.website, href: normalizeUrl(card.website) },
    { label: card.linkedin_url, href: normalizeUrl(card.linkedin_url) },
  ].filter((line) => line.label);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-steel p-6 text-center">
          {card.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.photo_url}
              alt={card.name}
              className="mx-auto mb-4 h-24 w-24 rounded-full object-cover"
            />
          )}
          <h1 className="text-xl font-semibold text-cloud">{card.name}</h1>
          {(card.title || card.company) && (
            <p className="mt-1 text-cloud">{[card.title, card.company].filter(Boolean).join(" · ")}</p>
          )}

          <div className="mt-5 space-y-2 text-left">
            {contactLines.map((line) => (
              <a key={line.label} href={line.href} className="block text-cloud underline">
                {line.label}
              </a>
            ))}
          </div>

          <a
            href={`/c/${id}/vcard`}
            className="mt-6 inline-block w-full rounded-xl bg-gold px-4 py-3 font-semibold text-deep-space"
          >
            Save Contact
          </a>
        </div>

        <a
          href={TAPCARD_APP_STORE_URL}
          className="mt-4 block w-full rounded-xl border border-slate px-4 py-3 text-center text-cloud"
        >
          Get TapCard — make your own free card →
        </a>

        <div className="mt-8 space-y-3">
          <PromoCard
            headline="Also drowning in old email?"
            body="MailBroom, from the same developer, looks at your mailbox and suggests what's safe to delete, save, or organise — in bulk, not one at a time."
            ctaLabel="Get MailBroom"
            href={MAILBROOM_APP_STORE_URL}
          />
          <PromoCard
            headline="Need to find someone's business email?"
            body="PowerSearch, also from Aiert Ltd, finds verified corporate email addresses across your accounts in seconds."
            ctaLabel="Get PowerSearch"
            href={POWERSEARCH_APP_STORE_URL}
          />
        </div>
      </div>
    </main>
  );
}

function normalizeUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function PromoCard({ headline, body, ctaLabel, href }: { headline: string; body: string; ctaLabel: string; href: string }) {
  return (
    <div className="rounded-xl bg-charcoal p-4">
      <p className="font-semibold text-cloud">{headline}</p>
      <p className="mt-1 text-sm text-cloud">{body}</p>
      <a href={href} className="mt-2 inline-block text-sm font-semibold text-teal">
        {ctaLabel} →
      </a>
    </div>
  );
}
