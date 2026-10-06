import type { Metadata } from "next";
import { headers } from "next/headers";
import { getEmployeeByClaimToken, getOrg } from "@/lib/tapcardBiz";
import { appStoreUrl, platformFromUserAgent, playStoreUrl } from "@/lib/tapcardInvites";

export const metadata: Metadata = {
  title: "Your company TapCard",
  robots: { index: false, follow: false },
};

// The link in every employee claim email (see
// app/api/tapcard/biz/employees/import/route.ts). With TapCard installed,
// iOS/Android hand this URL straight to the app (Universal Link / App Link
// — see app/api/tapcard/aasa and assetlinks), which POSTs to
// /api/biz/claim/<token> itself. This page is what everyone else sees:
// someone who hasn't installed the app yet, or is on a computer. It only
// looks the token up — never claims it — so opening it here first doesn't
// use up the invite.
export default async function BusinessClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const employee = await getEmployeeByClaimToken(token).catch(() => null);
  const org = employee ? await getOrg(employee.org_id).catch(() => null) : null;
  const platform = platformFromUserAgent((await headers()).get("user-agent") ?? "");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-white shadow-xl ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={org?.logo_url || "https://www.aiert.co.uk/tapcard-icon.png"}
          alt={org?.name || "TapCard"}
          className="mx-auto h-20 w-20 rounded-2xl bg-white object-contain"
        />
        {employee && org ? (
          <>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-teal">From {org.name}</p>
            <h1 className="mt-2 text-2xl font-bold">Your company TapCard is ready</h1>
            <ol className="mt-4 space-y-2 text-left text-white/80">
              <li>1. Install TapCard (free).</li>
              <li>2. Come back to the email and tap the link again — your card opens in the app, already filled in.</li>
            </ol>

            <div className="mt-6 flex flex-col items-center gap-3">
              <a href={appStoreUrl("business", "claim")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.aiert.co.uk/tapcard-badges/app-store-badge-white.png" alt="Download on the App Store" width={180} height={60} />
              </a>
              <a href={playStoreUrl("business", "claim")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.aiert.co.uk/tapcard-badges/google-play-badge.png" alt="Get it on Google Play" width={155} height={60} />
              </a>
            </div>
            {platform === "desktop" && (
              <p className="mt-4 text-xs text-white/60">TapCard is a phone app — open the email on your phone to claim your card.</p>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-bold">This invite link has expired or was already used</h1>
            <p className="mt-3 text-white/80">Ask your company&apos;s TapCard admin to send you a new invite.</p>
          </>
        )}
      </div>
    </main>
  );
}
