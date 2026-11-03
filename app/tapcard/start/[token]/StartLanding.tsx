"use client";

import { useEffect, useState } from "react";
import { PROMOTE_NOTE, PROMOTE_NOTE_TITLE } from "../../promoteNote";

const report = (token: string, event: "opened" | "store", platform = "") => {
  try {
    void fetch("/api/demo/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, event, platform }), keepalive: true });
  } catch { /* tracking must never get in the way */ }
};

export default function StartLanding({ token, appStoreHref, playStoreHref, isDesktop, fromContact = false }: { token: string; appStoreHref: string; playStoreHref: string; isDesktop: boolean; fromContact?: boolean }) {
  const valid = /^[A-Za-z0-9_-]{16,40}$/.test(token);
  useEffect(() => { if (valid) report(token, "opened"); }, [token, valid]);
  // For someone who already has TapCard but landed here (a browser, or a phone set to open the link in Safari): a button that opens the
  // app. iPhone opens it for a tap on a link to a different host (www.aiert.co.uk), which this host's own links do not; Android uses an intent.
  const [openHref, setOpenHref] = useState("");
  useEffect(() => {
    if (!valid) return;
    if (/android/i.test(navigator.userAgent)) {
      setOpenHref(`intent://tapcard.aiert.co.uk/start/${token}#Intent;scheme=https;package=com.mailbroom.tapcard;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`);
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setOpenHref(`https://www.aiert.co.uk/tapcard/start/${token}`);
    }
  }, [token, valid]);
  // Android: the token rides in the Play install referrer, so the app finds it on first launch. iPhone has no install
  // referrer: the link is copied when the button is tapped and the app offers to paste it on first launch.
  const playHref = valid ? `${playStoreHref}%26prebuilt%3D${encodeURIComponent(token)}` : playStoreHref;
  const copyLink = () => { try { void navigator.clipboard?.writeText(window.location.href); } catch { /* the email link still works */ } };
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-white shadow-xl ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="TapCard" className="mx-auto h-20 w-20 rounded-2xl" />
        <h1 className="mt-5 text-2xl font-bold">Your TapCard is ready</h1>
        <ol className="mt-4 space-y-2 text-left text-white/80">
          <li>1. Install TapCard (free to download).</li>
          <li>2. Open TapCard. {fromContact ? "Your card is already made, from the details your contact had for you, so you only need to check it and tap to keep it." : "Your card is already built, made from your own website."} On iPhone, tap <strong>Allow Paste</strong> if it asks.</li>
          <li className="text-white/60">If it doesn&apos;t appear, come back to the email and tap the link again.</li>
        </ol>
        {!fromContact && (
          <div className="mt-5 rounded-xl bg-white/10 p-3 text-left text-sm text-white">
            <p className="font-semibold">{PROMOTE_NOTE_TITLE}</p>
            <p className="mt-1">{PROMOTE_NOTE}</p>
          </div>
        )}
        <div className="mt-6 flex flex-col items-center gap-3">
          <a href={appStoreHref} onClick={() => { copyLink(); if (valid) report(token, "store", "ios"); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.aiert.co.uk/tapcard-badges/app-store-badge-white.png" alt="Download on the App Store" width={180} height={60} />
          </a>
          <a href={playHref} onClick={() => { if (valid) report(token, "store", "android"); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.aiert.co.uk/tapcard-badges/google-play-badge.png" alt="Get it on Google Play" width={155} height={60} />
          </a>
        </div>
        {openHref && !isDesktop && (
          <p className="mt-5 text-sm text-white/80">
            Already have TapCard? <a href={openHref} className="font-semibold underline text-white">Open your card in the app</a>
          </p>
        )}
        {isDesktop && <p className="mt-4 text-xs text-white/60">TapCard is a phone app. Open the email on your phone to get your card.</p>}
      </div>
    </main>
  );
}
