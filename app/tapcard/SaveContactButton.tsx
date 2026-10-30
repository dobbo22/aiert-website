"use client";

import { useSyncExternalStore } from "react";

// The one main action on a shared card. On a phone it is "Get TapCard": straight to the right store (App Store on iPhone,
// Google Play on Android) so the person who scanned ends up with the app, which opens on this card. Saving the contact
// stays available as a smaller link under it. On a computer, or on a card sent to one person, saving is the main action.
export default function SaveContactButton({
  cardId,
  cardLink,
  vcardHref,
  storeHref,
  openInAppHref,
  firstName,
  goToStore,
}: {
  cardId: string;
  /// This card's own link: on iPhone it is copied before the store opens (see CarryCardToInstall), so TapCard can open on this business after installing.
  cardLink: string;
  vcardHref: string;
  storeHref: string;
  openInAppHref?: string;
  firstName: string;
  goToStore: boolean;
}) {
  // Read once on the phone; false on the server and during hydration.
  const android = useSyncExternalStore(
    () => () => {},
    () => /android/i.test(navigator.userAgent),
    () => false,
  );

  // Android: opens TapCard on this card if it is already installed, otherwise Google Play (carrying this card in the install referrer).
  let getHref = storeHref;
  if (goToStore && android) {
    const card = /^[A-Za-z0-9_-]{16,40}$/.test(cardId) ? `&card=${cardId}` : "";
    const play = `https://play.google.com/store/apps/details?id=com.mailbroom.tapcard&referrer=${encodeURIComponent(`utm_source=tapcard-web&utm_medium=card-page${card}`)}`;
    const u = new URL(cardLink);
    getHref = `intent://${u.host}${u.pathname}#Intent;scheme=https;package=com.mailbroom.tapcard;S.browser_fallback_url=${encodeURIComponent(play)};end`;
  }

  const buttonClass =
    "flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#2A3560] to-[#422975] px-4 py-3.5 text-lg font-bold text-white shadow-lg shadow-black/40 ring-1 ring-white/25 transition-transform active:scale-[0.98]";
  const icon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-9 w-9 rounded-xl" />
  );

  if (!goToStore) {
    return (
      <div className="mt-5">
        <a href={vcardHref} className={buttonClass}>
          {icon}
          Save {firstName} to contacts
        </a>
        <p className="mt-2 text-center text-xs text-white">Get TapCard to make your own card.</p>
        {openInAppHref && (
          <p className="mt-2 text-center text-xs text-white">
            Already have TapCard?{" "}
            <a href={openInAppHref} className="font-semibold underline">Open in the app</a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5">
      <a href={getHref} className={buttonClass}>
        {icon}
        Get TapCard
      </a>
      <p className="mt-2 text-center text-xs text-white">Free. Opens on {firstName}&apos;s card so you can save it and send yours back.</p>
      <p className="mt-3 text-center text-sm text-white">
        <a href={vcardHref} className="font-semibold underline">Just save {firstName} to contacts</a>
      </p>
      {openInAppHref && (
        <p className="mt-2 text-center text-xs text-white">
          Already have TapCard?{" "}
          <a href={openInAppHref} className="font-semibold underline">Open in the app</a>
        </p>
      )}
    </div>
  );
}
