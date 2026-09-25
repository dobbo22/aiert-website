import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getCard, incrementViewCount } from "@/lib/tapcardDb";
import CompanyLogo from "../../CompanyLogo";
import ContactIcon, { type ContactIconName } from "../../ContactIcon";

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

  const contactLines: { action: string; value: string; href: string; icon: ContactIconName; iconBg: string }[] = [
    { action: "Call me", value: card.phone, href: `tel:${card.phone}`, icon: "phone", iconBg: "#22C55E" },
    { action: "Email me", value: card.email, href: `mailto:${card.email}`, icon: "mail", iconBg: "#A855F7" },
    { action: "Visit my site", value: card.website, href: normalizeUrl(card.website), icon: "globe", iconBg: "#3B82F6" },
  ];
  const visibleLines = contactLines.filter((line) => line.value);

  const socialLinks: { name: string; value: string; icon: ContactIconName; iconBg: string }[] = [
    { name: "LinkedIn", value: card.linkedin_url, icon: "linkedin", iconBg: "#0A66C2" },
    { name: "X", value: card.twitter_url, icon: "x", iconBg: "#000000" },
    {
      name: "Instagram",
      value: card.instagram_url,
      icon: "instagram",
      iconBg: "linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)",
    },
    { name: card.facebook_is_page ? "Facebook Page" : "Facebook", value: card.facebook_url, icon: "facebook", iconBg: "#0866FF" },
    { name: "TikTok", value: card.tiktok_url, icon: "tiktok", iconBg: "#000000" },
  ];
  const visibleSocials = socialLinks.filter((link) => link.value);

  const companyDomain = card.website ? extractDomain(card.website) : null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-3xl bg-[#111318] text-center shadow-xl ring-1 ring-white/10">
          {/* Cover banner: the card's own photo blurred out behind it, or
              the app icon's navy-to-purple gradient when there's no photo. */}
          <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#1A2138] to-[#422975]">
            {card.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.photo_url}
                alt=""
                className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111318]" />
            {card.label && (
              <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {card.label}
              </span>
            )}
          </div>

          <div className="relative -mt-16 px-5 pb-6">
            <div className="relative mx-auto h-28 w-28">
              {card.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.photo_url}
                  alt={card.name}
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-[#111318]"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/15 text-5xl text-white ring-4 ring-[#111318]">
                  🙂
                </div>
              )}
              {companyDomain && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 ring-4 ring-[#111318]">
                  <CompanyLogo domain={companyDomain} />
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold text-white">{card.name}</h1>
            {(card.title || card.company) && (
              <p className="mt-1 text-sm text-white">{[card.title, card.company].filter(Boolean).join(" · ")}</p>
            )}

            <a
              href={`/c/${id}/vcard`}
              className="mt-5 inline-block w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318]"
            >
              Save Contact
            </a>

            <div className="mt-5 space-y-2 text-left">
              {visibleLines.map((line) => (
                <a
                  key={line.action}
                  href={line.href}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-3 py-2.5 transition-colors hover:bg-white/[0.12]"
                >
                  {/* ring keeps the black X/TikTok tiles visible on the dark row */}
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/15"
                    style={{ background: line.iconBg }}
                  >
                    <ContactIcon name={line.icon} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold text-white">{line.action}</span>
                    <span className="truncate text-sm text-white">{displayUrl(line.value)}</span>
                  </span>
                </a>
              ))}
            </div>

            {visibleSocials.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-white">Follow me</p>
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-3">
                  {visibleSocials.map((link) => (
                    <a
                      key={link.name}
                      href={normalizeUrl(link.value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-16 flex-col items-center gap-1.5"
                    >
                      {/* ring keeps the black X/TikTok tiles visible on the dark card */}
                      <span
                        className="flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-white/15 transition-transform hover:scale-105"
                        style={{ background: link.iconBg }}
                      >
                        <ContactIcon name={link.icon} large />
                      </span>
                      <span className="text-xs leading-tight text-white">{link.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
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
            headline="Need to find an old email fast?"
            body="PowerSearch, also from Aiert Ltd, searches every connected account at once — great for finding that one email with your tickets, a contract, or a receipt buried months ago."
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

// Display only — the href keeps the full URL. Harmless on phone/email.
function displayUrl(value: string): string {
  return value.replace(/^https?:\/\/(www\.)?/i, "");
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
