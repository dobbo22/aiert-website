"use client";

import { useSyncExternalStore } from "react";

/// The company name and expiry from the invite after "#" — decoded only, not
/// verified (the secret lives on the server; the app's claim request is
/// what's checked). Read from the browser, so the server never sees it.
function readInvite(): { company: string; expired: boolean } | null {
  try {
    const body = window.location.hash.slice(1).split(".")[0];
    if (!body) return null;
    const json = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    return { company: String(json.c ?? ""), expired: typeof json.x === "number" && json.x < Date.now() };
  } catch {
    return null;
  }
}

// The whole invite (the part after "#"), to hand to the app once it is installed.
function readToken(): string {
  try { return window.location.hash.slice(1); } catch { return ""; }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export default function ClaimLanding({ appStoreHref, playStoreHref, isDesktop }: { appStoreHref: string; playStoreHref: string; isDesktop: boolean }) {
  // Snapshot as a string so it's stable between renders; null on the server.
  const raw = useSyncExternalStore(subscribe, () => JSON.stringify(readInvite()), () => "null");
  const invite = JSON.parse(raw) as { company: string; expired: boolean } | null;
  const token = useSyncExternalStore(subscribe, readToken, () => "");
  // Android: the invite rides in the Play install referrer, so the app finds it on first launch.
  // iPhone has no install referrer: the link is copied when the button is tapped, and the app offers to
  // paste it on first launch. Either way the card sets itself up; tapping the email link again also works.
  const playHref = token && /^[A-Za-z0-9._-]{20,1500}$/.test(token) ? `${playStoreHref}%26invite%3D${encodeURIComponent(token)}` : playStoreHref;
  const copyInvite = () => { try { void navigator.clipboard?.writeText(window.location.href); } catch { /* the email link still works */ } };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-white shadow-xl ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="TapCard" className="mx-auto h-20 w-20 rounded-2xl" />
        {invite?.expired ? (
          <>
            <h1 className="mt-5 text-2xl font-bold">This invite link has expired</h1>
            <p className="mt-3 text-white/80">Ask your company&apos;s TapCard admin for a new one.</p>
          </>
        ) : (
          <>
            {invite?.company && (
              <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-teal">From {invite.company}</p>
            )}
            <h1 className="mt-2 text-2xl font-bold">Your company TapCard is ready</h1>
            <ol className="mt-4 space-y-2 text-left text-white/80">
              <li>1. Install TapCard (free to download).</li>
              <li>2. Open TapCard. Your company card sets itself up, already filled in. On iPhone, tap <strong>Allow Paste</strong> if it asks.</li>
              <li className="text-white/60">If it doesn&apos;t, come back to the email and tap the link again.</li>
            </ol>
            <div className="mt-6 flex flex-col items-center gap-3">
              <a href={appStoreHref} onClick={copyInvite}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.aiert.co.uk/tapcard-badges/app-store-badge-white.png" alt="Download on the App Store" width={180} height={60} />
              </a>
              <a href={playHref}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.aiert.co.uk/tapcard-badges/google-play-badge.png" alt="Get it on Google Play" width={155} height={60} />
              </a>
            </div>
            {isDesktop && (
              <p className="mt-4 text-xs text-white/60">TapCard is a phone app — open the email on your phone to set up your card.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
