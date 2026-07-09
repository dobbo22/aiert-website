import Script from "next/script";

// Affiliate-click tracking for the Referral & Affiliate programme
// (app/mailbroom/webapp/affiliates) — scoped to MailBroom for Business
// pages only, not the whole aiert-website (ShareQuest, main AIERT site,
// etc.). Running two providers side by side for evaluation — FirstPromoter
// is the proven, live one (real 30%/12-month terms configured); Endorsely
// is being re-evaluated on a fresh account. Safe to run both: they use
// distinct globals (window.FPROM vs window.endorsely_referral).
export default function MailBroomWebAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script id="firstpromoter-init" strategy="afterInteractive">
        {`(function(w){w.fpr=w.fpr||function(){w.fpr.q = w.fpr.q||[];w.fpr.q[arguments[0]=='set'?'unshift':'push'](arguments);};})(window);
          fpr("init", {cid:"th0im41m"}); fpr("click");`}
      </Script>
      <Script src="https://cdn.firstpromoter.com/fpr.js" strategy="afterInteractive" async />
      <Script src="https://assets.endorsely.com/endorsely.js" data-endorsely="0ff935cf-9c47-4c3d-bc19-ca92ae9e9e85" strategy="afterInteractive" async />
      {children}
    </>
  );
}
