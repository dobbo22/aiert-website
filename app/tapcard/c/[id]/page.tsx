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
    { label: card.phone, href: `tel:${card.phone}`, icon: "📞" },
    { label: card.email, href: `mailto:${card.email}`, icon: "✉️" },
    { label: card.website, href: normalizeUrl(card.website), icon: "🌐" },
    { label: card.linkedin_url, href: normalizeUrl(card.linkedin_url), icon: "🔗" },
  ].filter((line) => line.label);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Same navy-to-purple gradient as the app icon and the iOS card view */}
        <div className="rounded-3xl bg-gradient-to-br from-[#1A2138] to-[#422975] p-6 text-center shadow-xl">
          {card.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.photo_url}
              alt={card.name}
              className="mx-auto mb-4 h-24 w-24 rounded-full border-2 border-white/50 object-cover"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/50 bg-white/15 text-4xl text-white">
              🙂
            </div>
          )}
          <h1 className="text-xl font-semibold text-white">{card.name}</h1>
          {(card.title || card.company) && (
            <p className="mt-1 text-white">{[card.title, card.company].filter(Boolean).join(" · ")}</p>
          )}

          <div className="mt-5 space-y-2 text-left">
            {contactLines.map((line) => (
              <a key={line.label} href={line.href} className="flex items-center gap-3 text-white">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm">
                  {line.icon}
                </span>
                <span className="underline">{line.label}</span>
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
          className="mt-4 flex items-center gap-3 rounded-xl border border-slate px-4 py-3 text-cloud"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tapcard-icon.png" alt="" className="h-8 w-8 rounded-lg" />
          <span>Get TapCard — make your own free card →</span>
        </a>

        <div className="mt-8 space-y-3">
          <PromoCard
            iconSrc="/mailbroom-icon.png"
            headline="Also drowning in old email?"
            body="MailBroom, from the same developer, looks at your mailbox and suggests what's safe to delete, save, or organise — in bulk, not one at a time."
            ctaLabel="Get MailBroom"
            href={MAILBROOM_APP_STORE_URL}
          />
          <PromoCard
            iconSrc="/powersearch-icon.png"
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

function PromoCard({
  iconSrc,
  headline,
  body,
  ctaLabel,
  href,
}: {
  iconSrc: string;
  headline: string;
  body: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <div className="rounded-xl bg-charcoal p-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt="" className="h-7 w-7 rounded-[7px]" />
        <p className="font-semibold text-cloud">{headline}</p>
      </div>
      <p className="mt-2 text-sm text-cloud">{body}</p>
      <a href={href} className="mt-2 inline-block text-sm font-semibold text-teal">
        {ctaLabel} →
      </a>
    </div>
  );
}
