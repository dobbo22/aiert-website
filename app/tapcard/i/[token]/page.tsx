import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  appStoreUrl,
  getSendByToken,
  isBotUserAgent,
  platformFromUserAgent,
  playStoreLive,
  playStoreUrl,
  recordInviteClick,
} from "@/lib/tapcardInvites";

const TITLE = "A free gift: TapCard, the business card swapper";
const DESCRIPTION = "Always be prepared. Your business card on your phone — swap cards with anyone in one tap. Free on iPhone.";

// What WhatsApp and iMessage show in the link preview bubble.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.aiert.co.uk/tapcard-wallet-hero.png"],
    siteName: "TapCard",
    type: "website",
  },
};

// The tracked link in every invite: tapcard.aiert.co.uk/i/<token>. Logs the
// click against that person's invite, then sends phones straight to their
// store with campaign attribution (App Store ct=, Play referrer UTMs).
// Link-preview fetchers aren't counted. Desktop gets this landing page.
export default async function InviteLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const send = await getSendByToken(token).catch(() => null);
  const campaign = send?.campaign ?? "unknown";
  const channel = send?.channel ?? "unknown";

  const requestHeaders = await headers();
  const ua = requestHeaders.get("user-agent") ?? "";
  const platform = platformFromUserAgent(ua);

  if (send && !isBotUserAgent(ua)) {
    await recordInviteClick(token, ua, requestHeaders.get("x-vercel-ip-country")).catch(() => {});
  }

  if (!isBotUserAgent(ua)) {
    if (platform === "ios") redirect(appStoreUrl(campaign, channel));
    if (platform === "android" && playStoreLive()) redirect(playStoreUrl(campaign, channel));
  }

  const firstName = send?.first_name || send?.name?.split(/\s+/)[0];
  const androidPending = platform === "android" && !playStoreLive();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-white shadow-xl ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="TapCard" className="mx-auto h-20 w-20 rounded-2xl" />
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-teal">
          {firstName ? `A free gift for ${firstName}` : "A free gift for you"}
        </p>
        <h1 className="mt-2 text-2xl font-bold">TapCard, the business card swapper</h1>
        <p className="mt-3 text-white/80">
          Your business card on your phone. Share it with a QR code or a link, and swap cards with anyone in one tap.
        </p>
        <p className="mt-3 font-semibold">Always be prepared.</p>

        {androidPending ? (
          <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm">
            TapCard for Android is with Google Play for review and will be available very soon.
          </p>
        ) : (
          <>
            <a
              href={appStoreUrl(campaign, channel)}
              className="mt-6 inline-block w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318]"
            >
              Get TapCard free on the App Store
            </a>
            {playStoreLive() && (
              <a
                href={playStoreUrl(campaign, channel)}
                className="mt-2 inline-block w-full rounded-xl px-4 py-3 font-semibold text-white ring-1 ring-white/30"
              >
                Get it on Google Play
              </a>
            )}
            {platform === "desktop" && (
              <p className="mt-4 text-xs text-white/60">TapCard is a phone app — open this link on your phone to install it.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
