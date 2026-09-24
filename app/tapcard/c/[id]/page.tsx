import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getCard, incrementViewCount } from "@/lib/tapcardDb";
import CompanyLogo from "../../CompanyLogo";

// TODO: real App Store id once TapCard is live in App Store Connect.
const TAPCARD_APP_STORE_URL = "https://apps.apple.com/app/tapcard";
const MAILBROOM_APP_STORE_URL = "https://apps.apple.com/app/mailbroom/id6766489663";
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

  // Counted here rather than via a client-side beacon so it also captures
  // link previews / crawlers minus render — acceptable for a rough "how many
  // times has this been opened" number, not a precise unique-visitor metric.
  after(() => incrementViewCount(id));

  const contactLines = [
    { action: "Call me", value: card.phone, href: `tel:${card.phone}`, icon: "📞", iconBg: "#22C55E" },
    { action: "Email me", value: card.email, href: `mailto:${card.email}`, icon: "✉️", iconBg: "#A855F7" },
    { action: "Visit my site", value: card.website, href: normalizeUrl(card.website), icon: "🌐", iconBg: "#3B82F6" },
    { action: "Follow my LinkedIn", value: card.linkedin_url, href: normalizeUrl(card.linkedin_url), icon: "🔗", iconBg: "#0A66C2" },
  ].filter((line) => line.value);

  const companyDomain = card.website ? extractDomain(card.website) : null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Same navy-to-purple gradient as the app icon and the iOS card view */}
        <div className="rounded-3xl bg-gradient-to-br from-[#1A2138] to-[#422975] p-6 text-center shadow-xl">
          {card.label && (
            <span className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              {card.label}
            </span>
          )}
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
            <p className="mt-1 flex items-center justify-center gap-2 text-white">
              {companyDomain && <CompanyLogo domain={companyDomain} />}
              <span>{[card.title, card.company].filter(Boolean).join(" · ")}</span>
            </p>
          )}

          <a
            href={`/c/${id}/vcard`}
            className="mt-5 inline-block w-full rounded-xl bg-gold px-4 py-3 font-semibold text-deep-space"
          >
            Save Contact
          </a>

          <div className="mt-5 space-y-2 text-left">
            {contactLines.map((line) => (
              <a
                key={line.action}
                href={line.href}
                className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/30 text-base"
                  style={{ backgroundColor: line.iconBg }}
                >
                  {line.icon}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-white">{line.action}</span>
                  <span className="truncate text-sm text-white">{line.value}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <a
          href={TAPCARD_APP_STORE_URL}
          className="mt-4 flex items-center gap-3 rounded-xl border border-slate px-4 py-3 text-cloud"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-8 w-8 rounded-lg" />
          <span>Get TapCard — make your own free card →</span>
        </a>

        <div className="mt-8 space-y-3">
          <PromoCard
            iconSrc="https://www.aiert.co.uk/mailbroom-icon.png"
            headline="Also drowning in old email?"
            body="MailBroom, from the same developer, looks at your mailbox and suggests what's safe to delete, save, or organise — in bulk, not one at a time."
            ctaLabel="Get MailBroom"
            href={MAILBROOM_APP_STORE_URL}
          />
          <PromoCard
            iconSrc="https://www.aiert.co.uk/powersearch-icon.png"
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

function extractDomain(website: string): string | null {
  try {
    return new URL(normalizeUrl(website)).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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
