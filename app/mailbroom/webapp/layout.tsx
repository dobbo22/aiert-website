import Script from "next/script";

// Endorsely affiliate-click tracking for the Referral & Affiliate programme
// (app/mailbroom/webapp/affiliates) — scoped to MailBroom for Business pages
// only, not the whole aiert-website (ShareQuest, main AIERT site, etc.).
export default function MailBroomWebAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        async
        src="https://assets.endorsely.com/endorsely.js"
        data-endorsely="45aad312-c1a0-4371-a354-e6de152436e5"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
