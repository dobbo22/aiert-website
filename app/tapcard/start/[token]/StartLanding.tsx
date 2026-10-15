"use client";

export default function StartLanding({ token, appStoreHref, playStoreHref, isDesktop }: { token: string; appStoreHref: string; playStoreHref: string; isDesktop: boolean }) {
  const valid = /^[A-Za-z0-9_-]{16,40}$/.test(token);
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
          <li>2. Open TapCard. Your card is already built, made from your own website. On iPhone, tap <strong>Allow Paste</strong> if it asks.</li>
          <li className="text-white/60">If it doesn&apos;t appear, come back to the email and tap the link again.</li>
        </ol>
        <div className="mt-6 flex flex-col items-center gap-3">
          <a href={appStoreHref} onClick={copyLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.aiert.co.uk/tapcard-badges/app-store-badge-white.png" alt="Download on the App Store" width={180} height={60} />
          </a>
          <a href={playHref}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.aiert.co.uk/tapcard-badges/google-play-badge.png" alt="Get it on Google Play" width={155} height={60} />
          </a>
        </div>
        {isDesktop && <p className="mt-4 text-xs text-white/60">TapCard is a phone app. Open the email on your phone to get your card.</p>}
      </div>
    </main>
  );
}
