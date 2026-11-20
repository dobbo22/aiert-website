import type { ReactNode } from "react";
import type { GuideRole } from "@/lib/guideRoles";

// The manual for each role. It describes the screens as they are (app/tapcard/business/admin/*, app/tapcard/business/adviser/*): update it with them.

const Steps = ({ children }: { children: ReactNode }) => <ol className="ml-5 mt-2 space-y-1.5 [&>li]:list-decimal!">{children}</ol>;
const Task = ({ id, title, children }: { id?: string; title: string; children: ReactNode }) => (
  <details id={id} className="rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
    <summary className="cursor-pointer font-semibold">{title}</summary>
    <div className="mt-2 space-y-2">{children}</div>
  </details>
);
const Box = ({ title, items }: { title: string; items: ReactNode[] }) => (
  <div className="rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
    <p className="font-semibold">{title}</p>
    <ul className="mt-1">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
  </div>
);

const GroupsNote = () => (
  <p className="rounded-lg bg-gold/15 px-3 py-2 ring-1 ring-gold/40">
    <strong>Groups need TapCard 4.3 or later</strong> (4.3.0 on Android). Someone who scans a group link on an older version just opens your card and joins no group. On 4.3 or later the follower joins the group, sees its name as a label on your card on their phone, and you see how many followers are in each group, never who.
  </p>
);

function CompanyCommon({ senior }: { senior: boolean }) {
  return (
    <>
      <Task id="post-general" title="Post a general headline (an event, webcast or meeting invitation)">
        <Steps>
          <li>Open <strong>News &amp; RNS</strong>.</li>
          <li>Stay on the <strong>Post</strong> tab. Under <em>Write your own headline</em>, leave <strong>Type</strong> on <em>General</em>.</li>
          <li>Write the headline (up to 140 characters). Add a link if there is one, such as a webcast page.</li>
          <li>Choose <strong>Send to</strong>: everyone who follows, or only chosen groups.</li>
          <li>Press <strong>Post to followers</strong>. The post is recorded in the audit trail.</li>
        </Steps>
        <p>Posts are one per half minute. Followers get a notification, and the headline shows on your card for anyone who opens it.</p>
      </Task>
      <Task id="groups" title="Make a group and give out its QR code">
        <p>Groups keep different audiences apart, for example the people at one event and your retail investors, so a headline reaches only those it is for. If you use an adviser, it works with groups on your behalf for each of its clients.</p>
        <Steps>
          <li>Open <strong>News &amp; RNS</strong>, then the <strong>Audiences</strong> tab. Type a name such as #Retail investors, then <strong>Add group</strong>.</li>
          <li>Each group has a link and a <strong>Show QR code</strong> button. Use that code on the slide or page meant for that audience.</li>
          <li>When you post, choose <em>Only these groups</em> to send the notification to them alone.</li>
        </Steps>
        <GroupsNote />
        <p>A group is only a label on someone who follows. We do not ask for or keep a name or email for it. Removing a group removes the label; people keep following.</p>
      </Task>
      <Task id="cards" title="Cards, QR codes and events">
        <p><strong>Cards &amp; QR</strong> holds the company card, team cards (chair, CEO, CFO, IR contact) and Events. A shareholder who follows through a team card follows the company. Events give one QR code for an AGM or roadshow, with optional time slots, and a list of who registered. The full steps are under <a href="/business/investor-guide#running-an-event">Running an AGM or a roadshow</a>.</p>
      </Task>
      <Task id="followers" title="See who follows, and the numbers">
        <p><strong>Followers</strong> lists people who chose to share a name and email, by company or all together, with a CSV download. <strong>Insights</strong> shows counts only: followers over time, how each announcement was read, and event registrations. Nobody is named on Insights.</p>
      </Task>
      {!senior && (
        <>
          <Task id="regulatory-general" title="What happens when I want to post a regulatory headline">
            <p>Regulatory (RNS) headlines can only be posted by a senior admin. If your company has <strong>second approval</strong> switched on, you can still write one: choose <em>Regulatory</em>, add the link, and press <strong>Submit for approval</strong>. It is not sent. A senior admin approves it on the <strong>Approvals</strong> tab. You can withdraw your own draft there before it is approved.</p>
            <p>If second approval is off, ask a senior admin to post it.</p>
          </Task>
          <Task id="not-allowed" title="Things only a senior admin can do">
            <ul>
              <li>Post, approve or withdraw a regulatory headline.</li>
              <li>Make someone senior, or switch second approval on or off.</li>
              <li>Approve, change or remove an adviser, or accept an adviser paying for the company.</li>
            </ul>
            <p>If you need one of these, ask a senior admin. You can see who they are on the <strong>People &amp; advisers</strong> tab of News &amp; RNS.</p>
          </Task>
        </>
      )}
    </>
  );
}

export function CompanySeniorManual() {
  return (
    <div className="space-y-3">
      <Box title="You can" items={["Post general and regulatory headlines, and withdraw them.", "Approve headlines that other people have written (not your own).", "Make admins senior or general, and switch second approval on or off.", "Approve or decline advisers, allow regulatory news for each, accept an adviser paying, or take billing back.", "Read and download the audit trail.", "Add and remove admins (up to five), set the announcements page, cards, QR codes, events and billing."]} />
      <Box title="You can't" items={["Approve your own regulatory draft: a different senior admin has to.", "Remove the last senior admin, or switch second approval on with fewer than two seniors."]} />
      <Task id="post-regulatory" title="Post a regulatory headline (an RNS)">
        <Steps>
          <li>Release the announcement through your regulatory news service first, and check it is on your own website.</li>
          <li>Open <strong>News &amp; RNS</strong>. New items from your announcements page are listed under <em>On your website</em>. Press <strong>Use as headline</strong> on the right one (or write your own).</li>
          <li>Set <strong>Type</strong> to <em>Regulatory (RNS)</em>. A link is required.</li>
          <li>Press <strong>Post to followers</strong>. TapCard checks the link against your announcements page. If it is not there yet, you are asked to confirm: posting anyway is allowed and is marked in the audit trail.</li>
          <li>If <strong>second approval</strong> is on, the button says <em>Submit for approval</em> and nothing goes out until a different senior admin approves it.</li>
        </Steps>
        <p>Post only after the announcement is public, and say nothing that is not in it. A headline and a link to the announcement is enough.</p>
      </Task>
      <Task id="approve" title="Approve or turn down a headline someone else wrote">
        <Steps>
          <li>Open <strong>News &amp; RNS</strong>, then the <strong>Approvals</strong> tab (a number shows when something is waiting).</li>
          <li>Read the headline and the line under it: it says whether the link was found on your announcements page.</li>
          <li>Press <strong>Approve and send</strong>, or <strong>Turn down</strong> with an optional note. If the link was not found you are asked to confirm, and that is recorded.</li>
        </Steps>
      </Task>
      <Task id="withdraw" title="Withdraw a headline">
        <p>On the <strong>Post</strong> tab of News &amp; RNS, under <em>Currently showing</em>, press <strong>Withdraw this headline</strong>. Withdrawing a regulatory headline is senior only. It is recorded.</p>
      </Task>
      <Task id="seniors" title="Choose who is senior, and switch on second approval">
        <p>On the <strong>People &amp; advisers</strong> tab of News &amp; RNS, under <em>Who can post what</em>, each admin has <em>Make senior</em> or <em>Make general only</em>. New admins start as general. Tick <strong>Second approval for regulatory headlines</strong> to make every regulatory post wait for a different senior admin. It needs at least two senior admins. The setup guide explains who to choose: <a href="/business/investor-guide/setup#roles">Who should be senior</a>.</p>
      </Task>
      <Task id="advisers" title="Approve an adviser, and decide what it may do">
        <Steps>
          <li>An adviser (an IR firm or broker) asks for access from its own portal. Your senior admins get an email.</li>
          <li>Open <strong>News &amp; RNS</strong>, then the <strong>People &amp; advisers</strong> tab. Nothing is allowed until you approve.</li>
          <li>If the adviser offers to pay for your TapCard, choose <strong>Approve and accept their payment</strong> (you are not billed), or <strong>Approve, we pay ourselves</strong>.</li>
          <li>Tick <strong>May post regulatory news</strong> only if you want that. It applies only to the adviser&apos;s own senior staff.</li>
          <li>Press <strong>Remove adviser</strong> any time: access ends at once.</li>
        </Steps>
        <p>An approved adviser can write general headlines and manage groups. It can never change your settings, admins or billing.</p>
      </Task>
      <Task id="take-over-billing" title="Take over billing from an adviser">
        <p>On the <strong>People &amp; advisers</strong> tab, press <strong>Pay ourselves instead</strong>. The adviser&apos;s payment ends when its minimum term ends, and you then have 30 days to start your own plan on <strong>Settings, Billing</strong>. Nothing is lost: followers, groups and history stay with you.</p>
      </Task>
      <Task id="audit" title="Read or download the audit trail">
        <p>Open <strong>News &amp; RNS</strong>, then the <strong>Audit trail</strong> tab. It lists every post, submission, approval, refusal, withdrawal, group change and adviser decision with who did it and when. <strong>Download as CSV</strong> gives the whole record. Nobody can edit or delete entries here.</p>
      </Task>
      <CompanyCommon senior />
    </div>
  );
}

export function CompanyGeneralManual() {
  return (
    <div className="space-y-3">
      <Box title="You can" items={["Post general headlines (events, webcasts, meeting invitations).", "Make and use groups, with their links and QR codes.", "Write a regulatory headline for approval, if your company has second approval switched on.", "Use Followers, Insights, Cards &amp; QR and events."]} />
      <Box title="You can't" items={["Post or withdraw a regulatory headline yourself.", "Make people senior, switch second approval on or off, or deal with advisers.", "Approve headlines."]} />
      <CompanyCommon senior={false} />
    </div>
  );
}

export function AdviserSeniorManual() {
  return (
    <div className="space-y-3">
      <Box title="You can" items={["Ask companies to approve your firm, and offer to pay for them.", "Write general headlines and manage groups for approved companies.", "Post and approve regulatory headlines only for companies that allowed it for your firm.", "Sign your firm up, add a card, and stop covering a company.", "See the plan, monthly total and each company's minimum term."]} />
      <Box title="You can't" items={["See or do anything for a company until it approves you.", "Change a company's settings, admins or billing.", "Approve your own regulatory draft.", "Remove a company's minimum term early: you pay until it ends."]} />
      <Task id="signin" title="Sign in">
        <p>Go to <a href="/business/adviser">tapcard.aiert.co.uk/business/adviser</a> and enter your work email. AIERT sets your firm up and adds your staff, so only listed addresses get a sign-in link. The link works once and expires in 15 minutes.</p>
      </Task>
      <Task id="ask" title="Ask a company to approve you">
        <Steps>
          <li>On the portal home, search for the company by name.</li>
          <li>Enter the company&apos;s <strong>market cap in £ millions</strong>. It sets the monthly price band, and AIERT confirms it.</li>
          <li>Leave <em>We will pay for this company</em> ticked if you will be paying. The company is then not billed.</li>
          <li>Press <strong>Ask to be approved</strong>. The company&apos;s senior admins are emailed and decide. You get access when one approves.</li>
        </Steps>
      </Task>
      <Task id="trial" title="The free trial, signing up and paying">
        <Steps>
          <li>The first company that accepts your payment starts a <strong>30-day free trial</strong>. The trial covers one company.</li>
          <li>About 14 days before it ends, we email your senior staff with the first charge.</li>
          <li>On <strong>Your plan</strong>, tick <em>I accept the adviser terms</em>, press <strong>Record acceptance</strong>, then <strong>Add card and subscribe</strong>. The card is stored now and the first charge is on the last day of the trial.</li>
          <li>Once paid, you can cover more companies. Each is charged monthly, by its market-cap band, plus VAT.</li>
        </Steps>
        <p>If you do not sign and pay, the trial company&apos;s headline posting pauses at day 30. Its followers and data are not touched.</p>
      </Task>
      <Task id="minimum-term" title="Minimum term, adding and stopping">
        <p>Each company you cover is committed for <strong>6 months</strong> from the day it is added. <strong>Stop covering</strong> ends cover at the end of that term; you pay until then. After cover ends, the company has 30 days to take over its own billing. Adding a company mid-month is charged pro rata. A company&apos;s band is reviewed at the end of each term.</p>
      </Task>
      <Task id="post-adviser" title="Write and post a headline for a company">
        <Steps>
          <li>On the portal home, press <strong>Open headlines</strong> next to the company.</li>
          <li>The note at the top tells you what you may do for this company.</li>
          <li>Choose <strong>Type</strong>: <em>General</em> for events and webcasts. <em>Regulatory</em> needs a link and works only if the company allowed it for your firm and you are senior. It is checked against the company&apos;s own announcements page.</li>
          <li>If the company has <strong>second approval</strong> on, a regulatory headline waits for approval. A company senior admin, or another senior member of your firm (if allowed), approves it.</li>
        </Steps>
      </Task>
      <Task id="card" title="Change your card or see invoices">
        <p>Press <strong>Card and invoices</strong> on Your plan. It opens a secure page to change your card and see invoices. Quantities and cancellation follow the companies you cover, so they are not changed there.</p>
      </Task>
      <Task id="groups-adviser" title="Groups for a client">
        <p>Groups are for advisers to keep a client&apos;s different audiences apart, for example the investors from one roadshow, one event or one investor list, so a headline reaches only the people it is for. A group belongs to one company; each client company has its own groups, and you reach them by switching company.</p>
        <p>Open the company&apos;s headlines and use the <strong>Audiences</strong> tab to add groups and get each group&apos;s link and QR code. Choose <em>Only these groups</em> when posting to send to them alone.</p>
        <GroupsNote />
      </Task>
    </div>
  );
}

export function AdviserGeneralManual() {
  return (
    <div className="space-y-3">
      <Box title="You can" items={["Write general headlines for approved companies.", "Make and use groups.", "Write a regulatory headline for approval, if the company has second approval on."]} />
      <Box title="You can't" items={["Post, approve or withdraw a regulatory headline yourself.", "Ask companies for access, sign the firm up, add a card or change what the firm pays: senior staff do that."]} />
      <Task id="signin" title="Sign in">
        <p>Go to <a href="/business/adviser">tapcard.aiert.co.uk/business/adviser</a> and enter your work email to get a one-time sign-in link.</p>
      </Task>
      <Task id="post-general" title="Post a general headline for a company">
        <Steps>
          <li>Press <strong>Open headlines</strong> next to the company.</li>
          <li>Write the headline, add a link if useful, choose who it goes to, and press <strong>Post to followers</strong>.</li>
        </Steps>
      </Task>
      <Task id="regulatory-adviser" title="A regulatory headline">
        <p>Ask a senior colleague. If the company has second approval switched on you can write one for approval: choose <em>Regulatory</em>, add the link, and press <strong>Submit for approval</strong>. It is not sent until someone senior approves it. You can withdraw your own draft.</p>
      </Task>
      <Task id="groups-adviser" title="Groups">
        <p>Groups are for advisers to keep a client&apos;s different audiences apart, for example the investors from one roadshow, one event or one investor list, so a headline reaches only the people it is for. A group belongs to one company; each client company has its own groups, and you reach them by switching company.</p>
        <p>Use the <strong>Audiences</strong> tab on the company&apos;s headlines page. <a href="#groups-adviser">Groups need TapCard 4.3 or later</a> to affect followers.</p>
      </Task>
    </div>
  );
}

export function ShareholderManual() {
  return (
    <div className="space-y-3">
      <Task id="follow" title="Following a company">
        <Steps>
          <li>Scan the company&apos;s QR code with your phone camera (on a results slide, the annual report or an AGM notice).</li>
          <li>It opens in the TapCard app. If you do not have it yet, install it, then come back to the page and press <strong>Open in TapCard</strong>.</li>
          <li>Choose <strong>Register and follow</strong> to share your name and email, or <strong>Follow only</strong> to share nothing.</li>
        </Steps>
      </Task>
      <Task id="get-news" title="What you receive">
        <p>The company&apos;s headlines as notifications, each with a link to the announcement on the company&apos;s own website. TapCard is not a replacement for the regulatory news service.</p>
      </Task>
      <Task id="group-link" title="If you scan a group QR code">
        <p>A company can give different QR codes to different audiences, such as the people at one event. Scanning one follows the company as usual and puts you in that group, so the company can send some headlines to that group only. The group name appears as a label on the company&apos;s card on your phone. The company sees how many followers are in each group, never who. Stopping following removes you from the group. Needs TapCard 4.3 or later.</p>
      </Task>
      <Task id="stop" title="Changing your mind">
        <p>You can stop following, or change to Follow only, at any time in the app. That removes your name and email from the company&apos;s list. Notification settings are on the card in the app.</p>
      </Task>
      <Task id="privacy" title="Your details">
        <p>You choose whether to share. The company is responsible for how it uses what you share, and shows its own privacy notice next to the form. See the <a href="/privacy">TapCard privacy policy</a>.</p>
      </Task>
    </div>
  );
}

export function RoleManual({ role }: { role: GuideRole }) {
  switch (role) {
    case "company-senior": return <CompanySeniorManual />;
    case "company-general": return <CompanyGeneralManual />;
    case "adviser-senior": return <AdviserSeniorManual />;
    case "adviser-general": return <AdviserGeneralManual />;
    default: return <ShareholderManual />;
  }
}
