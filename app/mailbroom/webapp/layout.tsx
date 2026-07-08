import Script from "next/script";

// FirstPromoter affiliate-click tracking for the Referral & Affiliate
// programme (app/mailbroom/webapp/affiliates) — scoped to MailBroom for
// Business pages only, not the whole aiert-website (ShareQuest, main AIERT
// site, etc.). Per FirstPromoter's own Stripe Checkout integration guide.
export default function MailBroomWebAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script id="firstpromoter-init" strategy="afterInteractive">
        {`(function(w){w.fpr=w.fpr||function(){w.fpr.q = w.fpr.q||[];w.fpr.q[arguments[0]=='set'?'unshift':'push'](arguments);};})(window);
          fpr("init", {cid:"th0im41m"}); fpr("click");`}
      </Script>
      <Script src="https://cdn.firstpromoter.com/fpr.js" strategy="afterInteractive" async />
      {children}
    </>
  );
}
