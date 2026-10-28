import type { Metadata } from "next";
import DocPage from "../../DocPage";

export const metadata: Metadata = {
  title: "Admin Guide – TapCard for Business | AIERT Ltd",
  description:
    "How to set up TapCard for Business: sign in, design your company card, invite your team from your own staff list, control who can post for which location, verify your business, and manage cards and billing.",
};

// Step-by-step guide for company admins. Describes the admin pages as they
// are (app/tapcard/business/admin/*) — update it alongside them.
export default function TapCardBusinessGuidePage() {
  return (
    <DocPage title="TapCard for Business: Admin Guide" updated="26 October 2026">
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
            then choose the free 30-day trial (one card, so you can try it on yourself) or two or more locations, from £42 a year each.
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
          don&apos;t need another one, and a second card would use up another of your cards.
        </p>
      </section>

      <section>
        <h2>4. What your employees do</h2>
        <ol className="ml-5 space-y-1.5 [&>li]:list-decimal!">
          <li>Install TapCard from the App Store or Google Play (free to download).</li>
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
            The <strong>Employees</strong> tab lists everyone who has set up their card, and how many of your cards are
            used. The <strong>Overview</strong> tab shows the same count.
          </li>
          <li>
            <strong>When someone leaves,</strong> press <strong>Remove</strong> next to their card. It&apos;s deleted
            straight away, its link and QR code stop working (including copies they forwarded on), and that place in your plan frees up.
          </li>
          <li>
            <strong>To rebrand,</strong> change the template. Cards pick up the change automatically.
          </li>
        </ul>
      </section>

      <section>
        <h2>Several locations: a worked example</h2>
        <p>For a restaurant group or any business with more than one shop, in this order:</p>
        <ol className="ml-5 mt-2 space-y-1.5 [&>li]:list-decimal!">
          <li>
            <strong>Sign up with a work email on your company&apos;s own website,</strong> for example{" "}
            <em>you@yourrestaurants.com</em> if your website is yourrestaurants.com. This is what lets your cards count
            as verified automatically (see <em>Verifying your business</em> below). A Gmail or Outlook address works,
            but then each card has to be verified one by one.
          </li>
          <li>
            On the <strong>Billing</strong> tab, choose the number of locations (two or more) and pay. Each location
            includes its own card and up to 10 staff cards.
          </li>
          <li>
            On the <strong>Card template</strong> tab, set the logo, website and social links, and lock the details
            staff must not change.
          </li>
          <li>
            On the <strong>Employees</strong> tab, invite each shop&apos;s manager and staff. Each person taps their
            link in the TapCard app and their card appears in your Active cards list.
          </li>
          <li>
            In the Active cards list, tick <strong>This card is a shop / location</strong> on each shop&apos;s card.
            Offers and news belong to that card, and customers follow it.
          </li>
          <li>
            For each manager, under <strong>Can post offers and news for</strong>, tick the shop or shops they may post
            for. Staff with no ticks cannot post.
          </li>
          <li>
            Set the staff PIN when an offer is created and tell your staff, so any of them can confirm a customer&apos;s
            code. Check results on the <strong>Offers &amp; numbers</strong> tab.
          </li>
        </ol>
      </section>

      <section>
        <h2>Who can do what</h2>
        <ul>
          <li>
            <strong>A company admin</strong> signs in on the web with an emailed link (no password). The first admin is the
            person who signed up, the <strong>owner</strong>. An admin can design the template, invite and remove cards,
            mark shops, choose who may post for which shop, post for any shop from <strong>Offers &amp; numbers</strong>,
            add or remove other admins, and manage billing. A company can have up to 5 admins.
          </li>
          <li>
            <strong>Adding a second admin.</strong> Open the <strong>Admins</strong> tab, type their work email and press{" "}
            <strong>Add admin</strong>. They get an email with a sign-in link, and from then on they can sign in at{" "}
            <a href="/business/admin">tapcard.aiert.co.uk/business/admin</a> with that address. The Admins tab shows who has
            signed in yet. Any admin can remove another admin (the person is signed out at once), but nobody can remove
            themselves, and the owner cannot be removed there: to hand the company to someone else, email{" "}
            <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a> from the owner&apos;s address. An email address can
            run only one company&apos;s account.
          </li>
          <li>
            <strong>A shop manager (web access).</strong> On the <strong>Admins</strong> tab, under <strong>Managers</strong>, type
            their email, tick the shop or shops they look after and press <strong>Add manager</strong>. They are emailed what they can do
            and a sign-in link. A manager signs in at the same address as an admin but sees only <strong>QR sign</strong> (to print and
            word their shop&apos;s sign), <strong>Employees</strong> (to create invite links for their shop&apos;s staff, and to remove a
            staff card when someone leaves) and <strong>Offers &amp; numbers</strong> (to post offers and news for their own shop). They never
            see billing, the template, locations or other admins. You can change a manager&apos;s shops, or remove them, at any time.
          </li>
          <li>
            <strong>A shop manager (in the app)</strong> is an employee who has made their shop&apos;s card from an invite link. Both the
            manager and the company&apos;s admins can post for the shop: the manager from their phone or the web, the admins from the web.
          </li>
          <li>
            <strong>Other staff</strong> have a card to share and nothing more. With no ticks they cannot post.
          </li>
          <li>
            <strong>Anyone who knows the staff PIN</strong> can confirm a customer&apos;s offer code on the web page, with
            no app or login. Change the PIN by setting the offer again if someone leaves who knew it.
          </li>
          <li>
            <strong>Locked details.</strong> Anything you lock on the template shows greyed out on every employee card
            and cannot be changed by them. Name is always editable.
          </li>
        </ul>
        <h3 className="mt-4 font-semibold">Keeping control as people come and go</h3>
        <ul>
          <li>
            <strong>An admin leaves:</strong> remove them on the <strong>Admins</strong> tab. Admins are different from cards, so
            also remove their card on the Employees tab if they had one.
          </li>
          <li>
            <strong>Someone leaves, or loses their phone:</strong> press <strong>Remove</strong> next to their card on
            the Employees tab. The card, its link and its QR code stop working at once, including copies they forwarded,
            and that place in your plan frees up. Send a new invite if they are replaced.
          </li>
          <li>
            <strong>A manager moves shop:</strong> untick the old shop and tick the new one. It takes effect straight
            away.
          </li>
          <li>
            <strong>Two people, one shop:</strong> a shop has one live offer at a time. Whoever posted it can change it
            that day, and someone else allowed to post for that shop can replace it from the next day, so nobody
            overwrites anybody else by accident.
          </li>
          <li>
            <strong>An invite link is the key to a card.</strong> Each works once and expires after 30 days. Send it
            only to the person it is for, and check the Active cards list matches who you expect.
          </li>
          <li>
            <strong>If payment stops:</strong> existing cards keep working but new invites cannot be made, and the cards
            that were counting as verified because of your plan stop doing so until billing is active again (see below).
          </li>
        </ul>
      </section>

      <section>
        <h2>Verifying your business</h2>
        <p>
          A verified business can post offers and news, and people who look you up see that the card is genuinely
          yours. TapCard checks you control the business&apos;s own website, never just the name.
        </p>
        <h3 className="mt-4 font-semibold">Your company cards: automatic when all three are true</h3>
        <ol className="ml-5 mt-2 space-y-1.5 [&>li]:list-decimal!">
          <li>Your company is active: a paid plan, or a free trial that has not ended.</li>
          <li>
            The card&apos;s website is your own domain (not Facebook, Linktree, a website-builder address or similar).
          </li>
          <li>
            The admin has signed in with an email on that same domain. For example, an admin who signed in as{" "}
            <em>you@yourrestaurants.com</em> verifies every card whose website is yourrestaurants.com.
          </li>
        </ol>
        <h3 className="mt-4 font-semibold">When a card is not verified automatically</h3>
        <p>
          This happens if you signed up with Gmail, Outlook or a similar address, or if a location has its own website on
          a different domain. Verify that card yourself. Open the card in the TapCard app, go to its offers and news
          section and choose <strong>Verify your business</strong>, then use either:
        </p>
        <ul className="mt-2">
          <li>
            <strong>Option 1, an email code.</strong> Enter an address ending in the website&apos;s domain. We send a
            6-digit code that works for 15 minutes, with 5 tries.
          </li>
          <li>
            <strong>Option 2, your website.</strong> Add the one line shown to your website&apos;s home page (or save
            the text as the file shown), then tap Check. A link to your TapCard page on your home page also works.
          </li>
        </ul>
        <h3 className="mt-4 font-semibold">Good to know</h3>
        <ul>
          <li>
            <strong>One verified card per website.</strong> If another card for your business was verified first, for
            example by a manager or an agency, a second cannot be. Email{" "}
            <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a> and we will move it.
          </li>
          <li>
            A card that was verified with a code or your website <strong>stays verified</strong> whatever happens to
            your plan. Only the automatic company verification depends on an active plan.
          </li>
          <li>
            <strong>Free trials:</strong> one per company email domain. Gmail, Outlook and other shared addresses get one
            trial per address.
          </li>
          <li>
            <strong>Reporting.</strong> Anyone can report a card that looks fake or wrong from the card itself. We review
            every report and can remove a card.
          </li>
        </ul>
      </section>

      <section>
        <h2>Offers and news: who posts, and who confirms a code</h2>
        <ul>
          <li>
            <strong>Offers belong to a shop.</strong> On the <strong>Employees</strong> tab, tick{" "}
            <strong>This card is a shop / location</strong> on each shop&apos;s card. Customers follow the shop, so its
            offers and news go to everyone who follows that shop, however many staff post for it.
          </li>
          <li>
            <strong>Who can post.</strong> Under <strong>Can post offers and news for</strong>, tick the shop or shops
            each person may post for, for example two managers per shop. They post from their own TapCard app on the
            shop&apos;s behalf. Someone with no ticks can&apos;t post at all, whatever they try, and new cards start with
            none. You can also post for any shop yourself from the <strong>Offers &amp; numbers</strong> tab, whatever
            the ticks say.
          </li>
          <li>
            <strong>One live offer per shop.</strong> A shop has only one valid offer at a time. The person who posted
            it can change or withdraw it that day (UK time). Anyone else allowed to post for that shop has to wait until
            the next day, or until the offer ends or has been withdrawn, so two people never overwrite each other. You,
            as admin, can always change it from the web. News works the same way, with one new line allowed every 6
            hours.
          </li>
          <li>
            <strong>Setting an offer.</strong> Write it, choose when it ends and how many people can claim it, and set a{" "}
            <strong>staff PIN</strong> of 4 to 6 digits. Tell your staff the PIN: it is what lets them confirm a code.
          </li>
          <li>
            <strong>Confirming a customer&apos;s code (any member of staff, no app or login).</strong> The customer
            shows their one-off QR code. Scan it with any phone camera: a page opens in the browser showing the offer.
            Type the staff PIN and tap <strong>Mark as used</strong>. On a till or computer with no camera, go to{" "}
            <strong>tapcard.aiert.co.uk/redeem</strong>, type the code shown under the QR code, then the PIN. Each code
            works once, and a second try shows when it was used. Confirming doesn&apos;t need any ticks: anyone who knows
            the PIN can do it.
          </li>
          <li>
            Customers only get offers if they have the TapCard app and follow the shop. You see how many followed,
            claimed and used each offer on the <strong>Offers &amp; numbers</strong> tab.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Billing and cards</h2>
        <ul>
          <li>
            The <strong>Billing</strong> tab shows your plan (the number of locations), how many cards you are allowed, and the renewal date.
          </li>
          <li>
            On the free trial, choose how many locations there to add your shops and your team. Payment is handled securely by Stripe.
          </li>
          <li>
            Once you&apos;re on a paid plan, <strong>Manage billing</strong> lets you change the number of locations, update your payment
            details, see invoices or cancel.
          </li>
          <li>
            Pricing is per location, billed yearly: £42 a year each for 2 to 4 locations, £34 each for 5 to 19, £27 each from 20. Each
            location includes its own card and up to 10 staff cards, and Promote (offers and news) on every location. A new card can only be
            set up while there is room: if you&apos;re full, remove a card or add a location.
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
            or add a location on the Billing tab.
          </li>
          <li>
            <strong>&quot;Verify your business first&quot; when posting:</strong> the card is not verified yet. Sign in to
            the admin area with an email on your own website&apos;s domain, or verify that card with a code or your
            website (see <em>Verifying your business</em>).
          </li>
          <li>
            <strong>&quot;Another TapCard for this business is already verified&quot;:</strong> a card for your website was
            verified earlier. Email <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a> and we will move it.
          </li>
          <li>
            <strong>&quot;A free trial has already been used for this company&quot;:</strong> someone from your email
            domain has taken the trial. Sign in instead, or choose a paid plan.
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
