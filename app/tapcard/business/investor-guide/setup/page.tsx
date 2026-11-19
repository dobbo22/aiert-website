import type { Metadata } from "next";
import type { ReactNode } from "react";
import DocPage from "../../../DocPage";
import { ADVISER_TIERS, ADVISER_TRIAL_DAYS, COVER_GRACE_DAYS, MIN_TERM_MONTHS, poundsPerMonth } from "@/lib/tapcardAdviserPricing";

export const metadata: Metadata = {
  title: "Investor Relations Setup Guide – TapCard | AIERT Ltd",
  description: "How to set up TapCard for investor relations: who to make senior, whether to use second approval, how to bring in an adviser, and a step-by-step first day.",
};

// The administrator's setup guide for the investor relations service. It describes the admin pages as they are: update it with them.

const Steps = ({ children }: { children: ReactNode }) => <ol className="ml-5 mt-2 space-y-2 [&>li]:list-decimal!">{children}</ol>;
const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="mt-3 overflow-x-auto">
    <table className="w-full border-collapse text-left text-sm">
      <thead><tr className="border-b border-white/25">{head.map((h) => <th key={h} className="px-2 py-2 align-top">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-white/10">{r.map((c, j) => <td key={j} className="px-2 py-2 align-top">{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

export default function InvestorSetupGuidePage() {
  return (
    <DocPage title="Setting up TapCard for investor relations" updated="19 November 2026">
      <section>
        <p>This is for the person setting up the company&apos;s account, and for advisers setting up a firm. It takes about half an hour. The role-by-role manual is in the <a href="/business/investor-guide">manual</a>. If you would rather be asked the questions and have your answers applied, signed-in admins can open the <a href="/business/admin/setup">guided setup</a>.</p>
        <ul className="mt-2">
          <li><a href="#before">Before you start</a></li>
          <li><a href="#roles">The roles, and who should have each</a></li>
          <li><a href="#steps">Setup, step by step</a></li>
          <li><a href="#examples">Examples: what to choose for your company</a></li>
          <li><a href="#advisers">If you work with an adviser</a></li>
          <li><a href="#adviser-firm">If you are the adviser</a></li>
          <li><a href="#who-pays">Who pays</a></li>
          <li><a href="#routine">Keeping it in order</a></li>
        </ul>
      </section>

      <section id="before">
        <h2>Before you start</h2>
        <p>Have these ready:</p>
        <ul>
          <li>The <strong>web address of your announcements page</strong> (where RNS announcements appear on your website).</li>
          <li><strong>Who is authorised to release an RNS</strong> at your company today. Those people should be senior admins.</li>
          <li>The email addresses of everyone who will use the admin. Each person needs their own address; there are no shared logins or passwords.</li>
          <li>Whether an <strong>IR adviser or broker</strong> will help, and whether they will pay for it.</li>
          <li>The link to your company&apos;s <strong>privacy notice</strong>.</li>
        </ul>
      </section>

      <section id="roles">
        <h2>The roles, and who should have each</h2>
        <Table head={["Role", "What they can do", "Who it usually suits"]} rows={[
          ["Company senior admin", "Post and withdraw regulatory headlines. Approve other people's. Make people senior, switch second approval on, and deal with advisers. Everything a general admin can do.", "CEO, CFO, company secretary: the people who already sign off an RNS."],
          ["Company general admin", "General headlines (events, webcasts, meeting invitations), groups, cards, QR codes, events and the numbers. Can write a regulatory headline for approval if second approval is on.", "IR manager, communications, an assistant."],
          ["Adviser senior staff", "For companies that approved the firm: general headlines and groups. Regulatory news only if the company allows it for the firm. Sign the firm up and pay.", "The partner or director at the IR firm or broker."],
          ["Adviser general staff", "General headlines and groups for approved companies. Can write a regulatory headline for approval if second approval is on.", "Account managers and juniors at the firm."],
          ["AIERT support", "Can look at the company, with the company's own permission, for two hours. Cannot post regulatory news or change billing.", "Only when you ask for help."],
        ]} />
        <h3 className="mt-5 text-base font-bold">Who should be senior</h3>
        <ul>
          <li><strong>Senior means &ldquo;can release regulatory news&rdquo;.</strong> Choose the people who would be allowed to release an RNS anyway. Keep it to two or three.</li>
          <li>The <strong>first admin</strong> (whoever signed up) is senior. <strong>Everyone added after that starts as general</strong>, and a senior admin makes them senior on the <em>People &amp; advisers</em> tab of News &amp; RNS.</li>
          <li>A company can have <strong>up to five admins</strong>.</li>
          <li>If you want <strong>second approval</strong>, you need at least <strong>two</strong> senior admins, because the person who writes a headline cannot approve it.</li>
          <li>Advisers are <strong>general by default</strong>. Allow regulatory news for an adviser only if it already posts announcements for you in practice, and then keep second approval on.</li>
          <li>Never share a login. The audit trail is only useful if each post is tied to one person.</li>
        </ul>
      </section>

      <section id="steps">
        <h2>Setup, step by step</h2>
        <Steps>
          <li><strong>Sign in.</strong> Go to <a href="/business/admin">tapcard.aiert.co.uk/business/admin</a> and enter your email. We send a one-time link; it expires in 15 minutes.</li>
          <li><strong>Check your company card.</strong> On <em>Overview</em> press <em>Open the card</em>. This is what a shareholder sees: your logo, investor pages and the follow button. Tell us if anything is wrong.</li>
          <li><strong>Add your admins.</strong> <em>Settings, Admins</em>: type each person&apos;s email. They get a sign-in link. Everyone you add starts as a <em>general</em> admin.</li>
          <li><strong>Choose who is senior.</strong> <em>News &amp; RNS, People &amp; advisers tab</em>: press <em>Make senior</em> next to each person who can release regulatory news. At least one admin must always stay senior.</li>
          <li><strong>Point TapCard at your announcements page.</strong> <em>News &amp; RNS, Post tab, On your website</em>: paste the address and press <em>Start watching</em>. What is on the page now is marked <em>Earlier</em>; new items are marked <em>New</em>. This is also what regulatory headlines are checked against.</li>
          <li><strong>Decide on second approval.</strong> Switch on <em>Second approval for regulatory headlines</em> if you want a second pair of eyes before anything goes out. Look at the <a href="#examples">examples</a>.</li>
          <li><strong>Add your team cards.</strong> <em>Cards &amp; QR, Team cards</em>: the chair, CEO, CFO and IR contact each get a card and QR code. A shareholder who follows through a person follows the company.</li>
          <li><strong>Set your privacy notice.</strong> <em>Settings, Privacy notice</em>: add the link to your own notice. The app shows it next to the form where a shareholder chooses to share their name and email.</li>
          <li><strong>Optional: groups.</strong> <em>News &amp; RNS, Audiences tab</em>: for example #Retail investors or #IPO clients, each with its own link and QR code, so you can send a headline to one audience. Groups take effect once the next app update is out.</li>
          <li><strong>Optional: bring in an adviser.</strong> See <a href="#advisers">below</a>.</li>
          <li><strong>Test before you go public.</strong> Follow your own card from your own phone, post a harmless general headline, and check it arrives. Look at the audit trail to see it recorded.</li>
          <li><strong>Put the QR code where shareholders look.</strong> Download it from <em>Cards &amp; QR, Company card</em>. Use it on results slides, the annual report, the AGM notice and your website. For an AGM or roadshow make an <em>Event</em> code (see the <a href="/business/investor-guide#running-an-event">manual</a>).</li>
        </Steps>
        <p className="mt-3 rounded-xl bg-white/[0.08] px-4 py-3 ring-1 ring-white/15"><strong>First day checklist:</strong> admins added · seniors chosen (two or three) · announcements page watched · second approval decided · team cards made · privacy notice linked · test headline posted and seen in the audit trail · QR code placed.</p>
      </section>

      <section id="examples">
        <h2>Examples: what to choose for your company</h2>
        <Table head={["Your situation", "Seniors", "Second approval", "Notes"]} rows={[
          ["Small company: a CEO and a finance director, one person does IR", "CEO and FD", "On", "Two seniors can approve each other's. The IR person is a general admin and writes headlines for them to approve."],
          ["One director runs everything", "That director", "Off (it needs two seniors)", "Rely on the audit trail. Consider adding a company secretary or adviser as a second senior if you want a check."],
          ["Mid-size company with an in-house IR team", "CEO, CFO, head of IR", "On", "Keep juniors general. Review the seniors each year."],
          ["An adviser posts RNS headlines for you today", "Your own two or three seniors", "On", "Approve the adviser and tick regulatory news for it. Its senior staff write, and one of your seniors (or a different senior at the adviser) approves."],
          ["An adviser only handles events and webcasts", "Your own seniors", "Optional", "Approve the adviser but leave regulatory news off. It writes general headlines and manages groups."],
        ]} />
      </section>

      <section id="advisers">
        <h2>If you work with an adviser</h2>
        <Steps>
          <li>Ask your adviser to <strong>ask for access</strong> from its portal at <a href="/business/adviser">tapcard.aiert.co.uk/business/adviser</a>. Your senior admins get an email.</li>
          <li>Open <em>News &amp; RNS, People &amp; advisers tab</em>. <strong>Nothing is allowed until you approve.</strong> If you do not know the firm, decline.</li>
          <li>If the adviser offers to pay for your TapCard, choose <strong>Approve and accept their payment</strong> and you are not billed. Otherwise choose <strong>Approve, we pay ourselves</strong>.</li>
          <li>Decide on <strong>regulatory news</strong>. The default is no. If you tick it, it applies only to the adviser&apos;s senior staff.</li>
          <li>You can <strong>remove the adviser</strong> at any time, and access ends at once. Everything the adviser does is in your audit trail, named as &ldquo;person (firm)&rdquo;.</li>
        </Steps>
        <p>An adviser can never change your settings, your admins or your billing, and your followers, groups and history always stay with you.</p>
      </section>

      <section id="adviser-firm">
        <h2>If you are the adviser</h2>
        <Steps>
          <li><strong>AIERT sets your firm up.</strong> Email <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a> with your firm name and the staff who need access. Mark who is <strong>senior</strong>: senior staff can handle regulatory news (where a company allows it), sign the firm up and pay. Everyone else is general staff.</li>
          <li><strong>Sign in</strong> at <a href="/business/adviser">tapcard.aiert.co.uk/business/adviser</a>.</li>
          <li><strong>Ask a company to approve you.</strong> Search for it, enter its <strong>market cap in £ millions</strong> (it sets the price), and leave <em>We will pay for this company</em> ticked if you will pay. The company decides.</li>
          <li><strong>Free trial.</strong> The first company that accepts your payment starts a {ADVISER_TRIAL_DAYS}-day trial. It covers one company.</li>
          <li><strong>Sign and pay.</strong> Before the trial ends, a senior member of staff accepts the adviser terms and adds a card. The first charge is on the last day of the trial, and we email 14 days before it.</li>
          <li><strong>Add more companies.</strong> Once you have paid, you can cover more. Each is billed monthly by its market-cap band, plus VAT, and committed for {MIN_TERM_MONTHS} months.</li>
        </Steps>
        <Table head={["Company market cap", "Per company per month (ex VAT)"]} rows={ADVISER_TIERS.map((t) => [t.label, poundsPerMonth(t.monthlyPence)])} />
        <p className="mt-2 text-sm">AIERT confirms the band, and it is reviewed at the end of each {MIN_TERM_MONTHS}-month term. Draft terms are in the portal, and are for legal review before they are relied on.</p>
      </section>

      <section id="who-pays">
        <h2>Who pays</h2>
        <Table head={["Arrangement", "Who pays AIERT", "What the company sees"]} rows={[
          ["The company pays itself (TapCard for Business plan)", "The company", "Its own billing page, as now."],
          ["The adviser pays for the company", "The adviser, by card, monthly, per company", "\"Your adviser is paying for your TapCard\". Not billed."],
          ["The adviser's cover ends or payment stops", "Nobody", `The company keeps working for ${COVER_GRACE_DAYS} days so it can take over. Nothing is deleted.`],
          ["The company takes over from the adviser", "The company", "Press Pay ourselves instead; the adviser's cover ends at its minimum term, then start a plan on Billing."],
        ]} />
        <p className="mt-2">The data belongs to the company in every arrangement. AIERT stores it for the company only.</p>
      </section>

      <section id="routine">
        <h2>Keeping it in order</h2>
        <ul>
          <li><strong>Each month:</strong> open <em>News &amp; RNS, Audit trail</em> and skim it. Download the CSV if you keep records.</li>
          <li><strong>When someone leaves:</strong> remove them under <em>Settings, Admins</em> the same day. If they were senior, make sure at least two seniors remain if you use second approval.</li>
          <li><strong>When you change adviser:</strong> remove the old one on <em>News &amp; RNS, People &amp; advisers</em> and approve the new one. Followers and history stay with you.</li>
          <li><strong>Each year:</strong> check who is senior, and whether second approval and any adviser&apos;s regulatory permission are still what you want.</li>
        </ul>
        <p className="mt-2">Questions: <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a>.</p>
      </section>
    </DocPage>
  );
}
