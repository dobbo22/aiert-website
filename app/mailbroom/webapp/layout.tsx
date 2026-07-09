import Script from "next/script";

// Endorsely affiliate-click tracking for the Referral & Affiliate
// programme (app/mailbroom/webapp/affiliates) — scoped to MailBroom for
// Business pages only, not the whole aiert-website (ShareQuest, main AIERT
// site, etc.). Fresh account started directly on app.mailbroom.app.
export default function MailBroomWebAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://assets.endorsely.com/endorsely.js" data-endorsely="0ff935cf-9c47-4c3d-bc19-ca92ae9e9e85" strategy="afterInteractive" async />
      {children}
    </>
  );
}
