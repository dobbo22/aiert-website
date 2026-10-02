import type { Metadata } from "next";
import { headers } from "next/headers";
import { firstNameOf } from "@/lib/inviteTemplates";
import { INVITE_LINK_ORIGIN, appStoreUrl, getSendByToken, platformFromUserAgent, playStoreLive, playStoreUrl } from "@/lib/tapcardInvites";

const TITLE = "A free gift: TapCard, the business card swapper";
const DESCRIPTION = "Always be prepared. Your business card on your phone — swap cards with anyone in one tap. Free on iPhone.";
const EXAMPLE_CARD = "https://www.aiert.co.uk/tapcard-email-card.png";

// What WhatsApp, iMessage and LinkedIn show in the link preview bubble: on
// someone's own invite link, a picture of their own card (as in the email);
// on a pass-it-on link, the example card.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ via?: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const shared = (await searchParams).via === "share";
  const send = shared ? null : await getSendByToken(token).catch(() => null);
  const firstName = send ? firstNameOf(send) : "";
  const title = firstName ? `${firstName}, here's your TapCard — a free gift from Martin` : TITLE;
  const image = send
    ? { url: `${INVITE_LINK_ORIGIN}/api/invite-card/${token}`, alt: `${firstName}'s TapCard` }
    : { url: EXAMPLE_CARD, alt: "An example TapCard" };
  return {
    title,
    description: DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: { title, description: DESCRIPTION, images: [image], siteName: "TapCard", type: "website" },
    twitter: { card: "summary_large_image", title, description: DESCRIPTION, images: [image.url] },
  };
}

// Landing page behind the invite links (/i/ and /p/ — see
// lib/inviteClickHandler.ts, which has already logged the click): what
// computers, link-preview fetchers and, until Play approval, Android see.
// Also supplies the WhatsApp/iMessage link-preview card via `metadata`.
export default async function InviteLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { token } = await params;
  const shared = (await searchParams).via === "share";
  const send = await getSendByToken(token).catch(() => null);
  const campaign = send?.campaign ?? "unknown";
  const channel = shared ? "share" : (send?.channel ?? "unknown");
  const platform = platformFromUserAgent((await headers()).get("user-agent") ?? "");

  const firstName = shared || !send ? null : firstNameOf(send);
  const androidPending = platform === "android" && !playStoreLive();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-white shadow-xl ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="TapCard" className="mx-auto h-20 w-20 rounded-2xl" />
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-teal">
          {shared ? "A friend thought you'd like this" : firstName ? `A free gift for ${firstName}` : "A free gift for you"}
        </p>
        <h1 className="mt-2 text-2xl font-bold">TapCard, the business card swapper</h1>
        <p className="mt-3 text-white/80">
          Your business card on your phone. Share it with a QR code or a link, and swap cards with anyone in one tap.
        </p>
        <p className="mt-3 font-semibold">Always be prepared.</p>

        {androidPending ? (
          <>
            <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm">
              TapCard for Android is with Google Play for review and will be available very soon.
            </p>
            <a
              href={send && !shared ? `/w/${token}` : "/android-waitlist"}
              className="mt-3 inline-block w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318]"
            >
              Tell me when it&apos;s ready
            </a>
          </>
        ) : (
          <>
            <div className="mt-6 flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href={appStoreUrl(campaign, channel)}>
                <img src="https://www.aiert.co.uk/tapcard-badges/app-store-badge-white.png" alt="Download on the App Store" width={180} height={60} />
              </a>
              {playStoreLive() && (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={playStoreUrl(campaign, channel)}>
                  <img src="https://www.aiert.co.uk/tapcard-badges/google-play-badge.png" alt="Get it on Google Play" width={155} height={60} />
                </a>
              )}
            </div>
            {platform === "desktop" && (
              <p className="mt-4 text-xs text-white/60">TapCard is a phone app — open this link on your phone to install it.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
