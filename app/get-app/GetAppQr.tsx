"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Platform = "apple" | "google";
type AppKey = "tapcard" | "powersearch" | "mailbroom";

const ICON = "https://www.aiert.co.uk";
const APPS: Record<AppKey, { name: string; tagline: string; icon: string; apple: string; google: string | null }> = {
  tapcard: {
    name: "TapCard",
    tagline: "Digital business card · free for the first 1,000 users",
    icon: `${ICON}/tapcard-icon.png`,
    apple: "https://apps.apple.com/app/id6816003159?pt=128647066&ct=qr-handout&mt=8",
    google: "https://play.google.com/store/apps/details?id=com.mailbroom.tapcard&referrer=utm_source%3Dqr%26utm_medium%3Dhandout",
  },
  powersearch: {
    name: "PowerSearch",
    tagline: "Search all your email accounts at once",
    icon: `${ICON}/powersearch-icon.png`,
    apple: "https://apps.apple.com/app/powersearch/id6807772868?pt=128647066&ct=qr-handout&mt=8",
    google: "https://play.google.com/store/apps/details?id=mailbroom.app&referrer=utm_source%3Dqr%26utm_medium%3Dhandout",
  },
  mailbroom: {
    name: "MailBroom",
    tagline: "Clean up your mailbox in bulk",
    icon: `${ICON}/mailbroom-icon.png`,
    apple: "https://apps.apple.com/app/mailbroom/id6766489663?pt=128647066&ct=qr-handout&mt=8",
    google: null, // not on Google Play yet
  },
};

export default function GetAppQr() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [app, setApp] = useState<AppKey | null>(null);
  const [svg, setSvg] = useState("");

  // Remember the choice in the address, so a bookmark opens straight to the QR code.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("p"), a = q.get("a");
    if (p === "apple" || p === "google") setPlatform(p);
    if (a === "tapcard" || a === "powersearch" || a === "mailbroom") setApp(a);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams();
    if (platform) q.set("p", platform);
    if (app) q.set("a", app);
    const s = q.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [platform, app]);

  const url = platform && app ? APPS[app][platform] : null;
  useEffect(() => {
    if (!url) { setSvg(""); return; }
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#000000", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [url]);

  const choice = "w-full rounded-2xl px-4 py-4 text-left text-lg font-bold ring-1 transition-colors";
  const on = "bg-white text-[#111318] ring-white";
  const off = "bg-white/10 text-white ring-white/25";

  return (
    <main className="min-h-screen bg-[#111318] px-4 py-6 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <h1 className="text-center text-2xl font-black">Get the app</h1>

        <section aria-label="Phone type">
          <p className="mb-2 text-sm font-semibold">1. Their phone</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setPlatform("apple")} className={`${choice} ${platform === "apple" ? on : off}`} aria-pressed={platform === "apple"}>
              iPhone
              <span className="block text-sm font-normal">App Store</span>
            </button>
            <button type="button" onClick={() => setPlatform("google")} className={`${choice} ${platform === "google" ? on : off}`} aria-pressed={platform === "google"}>
              Android
              <span className="block text-sm font-normal">Google Play</span>
            </button>
          </div>
        </section>

        <section aria-label="App">
          <p className="mb-2 text-sm font-semibold">2. The app</p>
          <div className="grid gap-3">
            {(Object.keys(APPS) as AppKey[]).map((key) => {
              const a = APPS[key];
              const unavailable = platform === "google" && a.google === null;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={unavailable}
                  onClick={() => setApp(key)}
                  aria-pressed={app === key}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left ring-1 transition-colors ${app === key ? on : off} ${unavailable ? "opacity-50" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icon} alt="" className="h-12 w-12 rounded-xl" />
                  <span className="flex flex-col">
                    <span className="text-lg font-bold leading-tight">{a.name}</span>
                    <span className="text-sm font-normal">{unavailable ? "Coming soon to Google Play" : a.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {url && app && platform && (
          <section aria-live="polite" className="rounded-3xl bg-white p-5 text-center text-[#111318] shadow-xl">
            <div className="flex items-center justify-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={APPS[app].icon} alt="" className="h-14 w-14 rounded-2xl" />
              <div className="text-left">
                <div className="text-xl font-black leading-tight">{APPS[app].name}</div>
                <div className="text-sm">{platform === "apple" ? "App Store" : "Google Play"}</div>
              </div>
            </div>
            <div
              role="img"
              aria-label={`QR code for ${APPS[app].name} on ${platform === "apple" ? "the App Store" : "Google Play"}`}
              className="mx-auto mt-4 aspect-square w-full max-w-[22rem] [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="mt-4 text-base font-semibold">Point your phone camera at the code</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={platform === "apple" ? "/tapcard-badges/app-store-badge.png" : "/tapcard-badges/google-play-badge.png"}
              alt={platform === "apple" ? "Download on the App Store" : "Get it on Google Play"}
              className="mx-auto mt-3 h-12 w-auto"
            />
          </section>
        )}
        {!url && <p className="text-center text-sm">Pick a phone and an app to show the QR code.</p>}
      </div>
    </main>
  );
}
