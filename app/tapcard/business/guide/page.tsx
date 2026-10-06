import type { Metadata } from "next";
import DocPage from "../../DocPage";

export const metadata: Metadata = {
  title: "Admin Guide – TapCard for Business | AIERT Ltd",
  description:
    "How to set up TapCard for Business: sign in, design your company card, invite your team from your own staff list, and manage cards and billing.",
};

// Step-by-step guide for company admins. Describes the admin pages as they
// are (app/tapcard/business/admin/*) — update it alongside them.
export default function TapCardBusinessGuidePage() {
  return (
    <DocPage title="TapCard for Business: Admin Guide" updated="6 October 2026">
      <section>
        <h2>Overview</h2>
        <p>Setting up your team takes three steps:</p>
        <ol className="ml-5 mt-2 space-y-1.5 [&>li]:list-decimal!">
          <li>
            <strong>Design your company card</strong>: logo, website, company social links, and which details employees
            can change.
          </li>
          <li>
            <strong>Invite your team</strong> from your own staff list. You get one link per person to send from your
            email.
          </li>
          <li>
            <strong>Each employee taps their link</strong> in the TapCard app and their card is ready to share.
          </li>
        </ol>
        <p className="mt-3">
          Your admin area is at <a href="/business/admin">tapcard.aiert.co.uk/business/admin</a>.
        </p>
      </section>

      <section>
        <h2>1. Sign up and sign in</h2>
        <ul>
          <li>
            Start at <a href="/business">tapcard.aiert.co.uk/business</a>. Enter your company name and work email,
            then choose the free trial (one seat, so you can try it on yourself) or a plan for your team.
          </li>
          <li>
            There are no passwords. To sign in, enter your email on the admin page and we&apos;ll email you a sign-in
            link. Open it and press <strong>Sign in</strong>. The link works once and expires after 15 minutes.
          </li>
          <li>
            If it says there&apos;s no account for your email, use <strong>Set up an account</strong>, or try the address
            you signed up with.
          </li>
          <li>You stay signed in on that browser for 30 days. Use <strong>Sign out</strong> on a shared computer.</li>
        </ul>
      </section>

      <section>
        <h2>2. Design your company card</h2>
        <p>
          Open the <strong>Card template</strong> tab.
        </p>
        <ul className="mt-3">
          <li>
            <strong>Company details:</strong> company name, website and brand colour (for example #1a73e8).
          </li>
          <li>
            <strong>Company logo:</strong> press <strong>Use logo from website</strong> to fetch the logo from your
            website, or <strong>Upload logo</strong> to choose a file (PNG, JPEG or WebP, up to 2 MB). A logo with a
            transparent background, like the one in your website&apos;s header, looks best. The logo saves straight away
            and appears on every employee&apos;s card and Wallet pass. If the wrong image is picked up, upload the right
            one instead.
          </li>
          <li>
            <strong>Company social links:</strong> LinkedIn, X, Instagram, Facebook, TikTok and WhatsApp for the company.
            These replace personal profiles on everyone&apos;s card.
          </li>
          <li>
            <strong>What employees can edit:</strong> tick a field to lock it. Locked fields always show your
            company&apos;s value and are greyed out in the app. Name is always editable. Locking job title, phone or
            address keeps what each card already has.
          </li>
        </ul>
        <p className="mt-3">
          Press <strong>Save template</strong>. Changes reach everyone&apos;s card the next time they open TapCard.
        </p>
      </section>

      <section>
        <h2>3. Invite your team</h2>
        <p>
          Open the <strong>Employees</strong> tab. You need a staff list with each person&apos;s name, email and job
          title. The list is read on your computer only: TapCard never uploads or keeps it.
        </p>
        <p className="mt-3">
          <strong>The simplest list is a spreadsheet</strong> with three columns, in this order:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-charcoal p-4 text-sm ring-1 ring-white/10">{`name,email,title
Jane Smith,jane@yourcompany.com,Sales Director
Sam Patel,sam@yourcompany.com,Account Manager`}</pre>
        <p className="mt-3">
          In Excel, use <strong>File → Save As → CSV</strong>. A header row is fine, but don&apos;t use commas inside a
          name or job title. You can also use a contacts export saved as a vCard (.vcf) file, for example from Google
          Contacts (<strong>Export → vCard</strong>) or iCloud Contacts (select the contacts, then{" "}
          <strong>Export vCard</strong>). Only people with an email address are included.
        </p>
        <p className="mt-3">Then:</p>
        <ol className="ml-5 mt-2 space-y-1.5 [&>li]:list-decimal!">
          <li>Choose the file. The page shows how many people it found.</li>
          <li>
            Press <strong>Create invite links</strong>.
          </li>
          <li>
            Send each person their link from your own email, whichever way suits you:
            <ul className="mt-1.5">
              <li>
                <strong>Email</strong> opens a ready-written message in your email app.
              </li>
              <li>
                <strong>Copy link</strong> lets you paste it into your own message or chat.
              </li>
              <li>
                <strong>Download for mail merge (CSV)</strong> gives you every name, email, link and message in one
                file, for a mail merge in Word and Outlook.
              </li>
            </ul>
          </li>
        </ol>
        <p className="mt-3">
          <strong>The links aren&apos;t saved anywhere,</strong> so send or download them before leaving the page. Each
          link works once and expires after 30 days. If someone loses theirs, create a new link for just that person,
          but check the <strong>Active cards</strong> list first: if they&apos;ve already set up their card, they
          don&apos;t need another one, and a second card would use another seat.
        </p>
      </section>

      <section>
        <h2>4. What your employees do</h2>
        <ol className="ml-5 space-y-1.5 [&>li]:list-decimal!">
          <li>Install TapCard from the App Store or Google Play (free).</li>
          <li>
            Open your email <strong>on their phone</strong> and tap their invite link. TapCard opens and sets up their
            card, already filled in with their name, job title, email and your company details.
          </li>
          <li>Add a photo, mobile number or anything else not locked, then share it straight away.</li>
        </ol>
        <p className="mt-3">
          If they tap the link before installing the app, they&apos;ll see a page asking them to install TapCard and
          then tap the link again. The link isn&apos;t used up until the card is actually set up.
        </p>
      </section>

      <section>
        <h2>5. Manage your team</h2>
        <ul>
          <li>
            The <strong>Employees</strong> tab lists everyone who has set up their card, and how many of your seats are
            used. The <strong>Overview</strong> tab shows the same count.
          </li>
          <li>
            <strong>When someone leaves,</strong> press <strong>Remove</strong> next to their card. It&apos;s deleted
            straight away, its link and QR code stop working (including copies they forwarded on), and the seat frees up.
          </li>
          <li>
            <strong>To rebrand,</strong> change the template. Cards pick up the change automatically.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Billing and seats</h2>
        <ul>
          <li>
            The <strong>Billing</strong> tab shows your plan, number of seats and renewal date.
          </li>
          <li>
            On the free trial, pick a plan there to add your team. Payment is handled securely by Stripe.
          </li>
          <li>
            Once you&apos;re on a paid plan, <strong>Manage billing</strong> lets you change plan, update your payment
            details, see invoices or cancel.
          </li>
          <li>
            A new card can only be set up while you have a free seat. If you&apos;re full, remove a card or move to a
            bigger plan.
          </li>
          <li>
            If a payment lapses, existing cards keep working, but new invites can&apos;t be created or used until billing
            is active again.
          </li>
          <li>
            More than 100 people? <a href="mailto:enquiries@aiert.co.uk">Email us</a> about a larger plan.
          </li>
        </ul>
      </section>

      <section>
        <h2>Troubleshooting</h2>
        <ul>
          <li>
            <strong>No sign-in email:</strong> check your Junk folder. On Microsoft 365, also ask your IT team to check
            quarantine for mail from TapCard. Then request a new link.
          </li>
          <li>
            <strong>&quot;That sign-in link has expired or was already used&quot;:</strong> request a new one. Links last
            15 minutes and work once.
          </li>
          <li>
            <strong>An employee&apos;s link opens a web page instead of the app:</strong> TapCard isn&apos;t installed
            yet, or they opened the email on a computer. Install the app, then tap the link again on their phone.
          </li>
          <li>
            <strong>&quot;This invite link was already used&quot;:</strong> the card has been set up. Check the{" "}
            <strong>Active cards</strong> list. If that wasn&apos;t the right person, remove the card and send a new
            invite.
          </li>
          <li>
            <strong>&quot;Isn&apos;t valid or has expired&quot;:</strong> create a new link. Links last 30 days.
          </li>
          <li>
            <strong>&quot;Your company has used all its TapCard seats&quot;:</strong> remove a card you no longer need,
            or upgrade on the Billing tab.
          </li>
          <li>
            <strong>The file shows 0 people:</strong> make sure it&apos;s a CSV with the columns name, email, title, or a
            vCard (.vcf), and that people have email addresses.
          </li>
        </ul>
      </section>

      <section>
        <h2>Security and privacy</h2>
        <p>
          How your data is handled, including why we never store your staff list, is explained on the{" "}
          <a href="/business/security">security &amp; privacy</a> page. Questions:{" "}
          <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a>.
        </p>
      </section>
    </DocPage>
  );
}
