"use client";

// The one main action on a shared card: save the contact and, on a phone,
// send the visitor on to the right store (App Store on iPhone, Google Play on
// Android) so they can get TapCard and send their own card back. The link is
// a plain download, so saving still works if the script doesn't run.
export default function SaveContactButton({
  cardLink,
  vcardHref,
  storeHref,
  openInAppHref,
  firstName,
  goToStore,
}: {
  /// This card's own link: on iPhone it is copied before the store opens, so TapCard can open on this business after installing.
  cardLink: string;
  vcardHref: string;
  storeHref: string;
  openInAppHref?: string;
  firstName: string;
  goToStore: boolean;
}) {
  return (
    <div className="mt-5">
      <a
        href={vcardHref}
        onClick={() => {
          if (!goToStore) return;
          if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            try { void navigator.clipboard?.writeText(cardLink); } catch { /* the store opens either way */ }
          }
          // Give the phone time to start the save before the store opens.
          window.setTimeout(() => {
            window.location.href = storeHref;
          }, 2500);
        }}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#2A3560] to-[#422975] px-4 py-3.5 text-lg font-bold text-white shadow-lg shadow-black/40 ring-1 ring-white/25 transition-transform active:scale-[0.98]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-9 w-9 rounded-xl" />
        Save {firstName} to contacts
      </a>
      <p className="mt-2 text-center text-xs text-white">
        {goToStore
          ? "Then get TapCard, so you can send your card back."
          : "Get TapCard to make your own card."}
      </p>
      {openInAppHref && (
        <p className="mt-2 text-center text-xs text-white">
          Already have TapCard?{" "}
          <a href={openInAppHref} className="font-semibold underline">
            Open in the app
          </a>
        </p>
      )}
    </div>
  );
}
