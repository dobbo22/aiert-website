import { ADVISER_TIERS, ADVISER_TERMS_VERSION, COVER_GRACE_DAYS, MIN_TERM_MONTHS, ADVISER_TRIAL_DAYS, poundsPerMonth } from "@/lib/tapcardAdviserPricing";

export const metadata = { title: "TapCard adviser terms (draft)", robots: { index: false, follow: false } };

// DRAFT summary of the commercial terms an adviser accepts before paying. It must be reviewed by a lawyer before it is relied on.
export default function AdviserTermsPage() {
  return (
    <main className="biz-admin min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl text-cloud">
        <p className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black">Draft for legal review. Version {ADVISER_TERMS_VERSION}.</p>
        <h1 className="mt-4 text-2xl font-black">TapCard adviser terms</h1>
        <ol className="mt-4 list-decimal space-y-3 pl-5">
          <li><strong>What this covers.</strong> AIERT Ltd provides TapCard investor-relations cards to companies. You, as an adviser, may pay for the companies you look after and manage their headlines when they approve you.</li>
          <li><strong>The company decides.</strong> You can act for a company only after its own senior admin approves you, and only as far as it allows. You must have its authority. It can remove you at any time.</li>
          <li><strong>Data.</strong> Each company is responsible for its shareholders&apos; details and owns them. AIERT stores them for the company only. They do not belong to you, and stay with the company if you leave or stop paying.</li>
          <li><strong>Free trial.</strong> {ADVISER_TRIAL_DAYS} days for one company, starting when that company accepts your payment. To keep it, and to cover more companies, you accept these terms and pay by card. The first charge is on the last day of the trial.</li>
          <li><strong>Price.</strong> A monthly price for each company you cover, plus VAT, set by the company&apos;s market cap and checked by AIERT: {ADVISER_TIERS.map((t) => `${t.label} ${poundsPerMonth(t.monthlyPence)}`).join("; ")}. A company&apos;s band is reviewed at the end of each minimum term and any change starts from the next term.</li>
          <li><strong>Minimum term.</strong> Each company is committed for {MIN_TERM_MONTHS} months from the day you add it. If you stop covering it earlier, you still pay until the {MIN_TERM_MONTHS} months end. After that, a monthly rolling subscription continues until you stop covering it.</li>
          <li><strong>Adding and removing companies.</strong> Adding a company is charged from the day it is added (pro rata for the current month). Removing one takes effect at the end of its minimum term.</li>
          <li><strong>When cover ends.</strong> If cover ends or payment stops, the company keeps working for {COVER_GRACE_DAYS} days so it can take over its own billing. Nothing is deleted because of billing.</li>
          <li><strong>Regulatory announcements.</strong> You post regulatory news only where the company allows it and only through a senior member of your staff. Every post, approval and withdrawal is recorded. You are responsible for what you post.</li>
        </ol>
        <p className="mt-6"><a href="/business/adviser" className="text-gold underline">Back to the adviser portal</a></p>
      </div>
    </main>
  );
}
