// Official App Store / Google Play badges (public/tapcard-badges), shown at
// the same height side by side. Pass only the stores an app is on. Google's
// badge PNG has transparent padding (16px of 96), so it's drawn larger with a
// negative margin to match the App Store badge's visible height.
export default function StoreBadges({
  appStoreUrl,
  playStoreUrl,
  className = "",
}: {
  appStoreUrl?: string;
  playStoreUrl?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {appStoreUrl && (
        <a href={appStoreUrl} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.aiert.co.uk/tapcard-badges/app-store-badge.png"
            alt="Download on the App Store"
            width={150}
            height={50}
            className="block"
          />
        </a>
      )}
      {playStoreUrl && (
        <a href={playStoreUrl} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.aiert.co.uk/tapcard-badges/google-play-badge.png"
            alt="Get it on Google Play"
            width={194}
            height={75}
            className="-m-[12px] block"
          />
        </a>
      )}
    </div>
  );
}
