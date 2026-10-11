"use client";

// The one main action on a shared card: save the contact and, on a phone,
// send the visitor on to the right store (App Store on iPhone, Google Play on
// Android) so they can get TapCard and send their own card back. The link is
// a plain download, so saving still works if the script doesn't run.
export default function SaveContactButton({
  vcardHref,
  storeHref,
  openInAppHref,
  firstName,
  goToStore,
}: {
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
          // Give the phone time to start the save before the store opens.
          window.setTimeout(() => {
            window.location.href = storeHref;
          }, 2500);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2DD4BF] to-[#22C55E] px-4 py-4 text-lg font-bold text-[#111318] shadow-lg shadow-black/30 transition-transform active:scale-[0.98]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
        Save {firstName} to contacts
      </a>
      <p className="mt-2 text-center text-xs text-white">
        {goToStore
          ? "Then get TapCard free, so you can send your card back."
          : "Get TapCard free to make your own card."}
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
