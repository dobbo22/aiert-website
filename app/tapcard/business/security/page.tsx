import type { Metadata } from "next";
import DocPage from "../../DocPage";

export const metadata: Metadata = {
  title: "Security & Privacy – TapCard for Business | AIERT Ltd",
  description:
    "How TapCard for Business keeps your staff list on your own computer, what AIERT stores, how invite links and cards are protected, and who can remove a card.",
};

// Every statement here describes what the code actually does — keep it in
// step with lib/tapcardBiz.ts, lib/tapcardBizInvite.ts, lib/tapcardBizAuth.ts,
// app/api/tapcard/biz/* and app/api/tapcard/cards/* when they change.
export default function TapCardBusinessSecurityPage() {
  return (
    <DocPage title="Security & Privacy for TapCard for Business" updated="6 October 2026">
      <section>
        <h2>In short</h2>
        <ul>
          <li>
            <strong>Your staff list stays with you.</strong> You choose it on your own computer and it is read there.
            AIERT never uploads or keeps it.
          </li>
          <li>
            <strong>You send the invites,</strong> from your own email. AIERT never emails your staff.
          </li>
          <li>
            <strong>Each invite link is signed, works once and expires after 30 days.</strong>
          </li>
          <li>
            <strong>Only the employee or your admin can remove a card.</strong> Removing it stops its link everywhere,
            including copies that were forwarded on.
          </li>
          <li>No advertising, no tracking, and we never sell or share your data for marketing.</li>
        </ul>
      </section>

      <section>
        <h2>What AIERT stores</h2>
        <p>About your company:</p>
        <ul>
          <li>company name, email domain, website, brand colour and company social links</li>
          <li>your company logo, if you add one</li>
          <li>which card fields employees can and can&apos;t edit</li>
          <li>the email address of each admin, so they can sign in</li>
          <li>your plan, billing status and the Stripe customer and subscription references (no card details)</li>
        </ul>
        <p className="mt-3">About each employee, only once they activate their card:</p>
        <ul>
          <li>
            their card: name, job title and email from the invite, the company details above, and anything they add
            themselves in the app, such as a phone number or photo
          </li>
          <li>a one-way hash of the card&apos;s secret edit key (see below)</li>
        </ul>
        <p className="mt-3">
          For each invite that has been used, we keep only a one-way hash of the invite&apos;s random ID and the date,
          so it can&apos;t be used twice. That says nothing about who it was for. Invites that are never used leave
          nothing behind at all.
        </p>
      </section>

      <section>
        <h2>What AIERT never stores</h2>
        <ul>
          <li>your staff list, or anyone you invited who hasn&apos;t activated their card</li>
          <li>staff photos from you. Employees add their own photo in the app if they want one</li>
          <li>payment card details, which are handled entirely by Stripe</li>
        </ul>
      </section>

      <section>
        <h2>How invites work</h2>
        <p>
          On the Employees page you choose your staff list: a CSV, or a contacts export from Outlook / Microsoft 365,
          Google or iCloud. Your browser reads the file on your computer. Only each person&apos;s name, email and job
          title are sent to us, once, to be signed into an invite link. Nothing is saved, and the links come straight
          back for you to send from your own email.
        </p>
        <ul className="mt-3">
          <li>
            <strong>Signed:</strong> each link carries the person&apos;s details and a cryptographic signature (HMAC-SHA256)
            made with a key only our server holds. Changing any detail, or making up a link, makes it invalid.
          </li>
          <li>
            <strong>Single use:</strong> the first time a link is used to set up a card it is marked as spent, and two
            taps at once can&apos;t both succeed.
          </li>
          <li>
            <strong>30-day expiry,</strong> after which the link no longer works.
          </li>
          <li>
            <strong>Kept out of server logs:</strong> the details sit after the &quot;#&quot; in the link, a part
            browsers never send to a server. Only the TapCard app sends them, once, inside the request that sets up the
            card.
          </li>
          <li>
            <strong>Seat limits:</strong> a card can only be set up while your plan has a free seat and billing is
            active.
          </li>
        </ul>
        <p className="mt-3">
          Treat an invite like a password-reset email: until it&apos;s used, anyone who has the link could set up that
          card. If one goes to the wrong person, remove the card on the Employees page and send a new invite.
        </p>
      </section>

      <section>
        <h2>How cards are protected</h2>
        <ul>
          <li>
            <strong>Only the card&apos;s owner can change it.</strong> When an employee activates their card, their phone
            receives a secret edit key that never leaves it, except to authorise their own changes. We store only a
            one-way hash of that key, so changing, deleting or sending a card as that person needs their phone.
          </li>
          <li>
            <strong>Locked fields are enforced by our server, not just the app,</strong> so the company details you
            lock can&apos;t be changed by an old app version or a hand-made request. When you update your template,
            employees&apos; cards pick up the change.
          </li>
          <li>
            <strong>Card links are long and random</strong> (128 bits) and can&apos;t be guessed, and card pages ask
            search engines not to index them.
          </li>
        </ul>
      </section>

      <section>
        <h2>Who can see a card, and forwarding</h2>
        <p>
          A card is made to be shared: anyone with its link, QR code or Wallet pass can see it and save the contact.
          Like a paper business card, it can&apos;t be stopped from being passed on once someone has it. They could
          forward the link or save the details. What TapCard does guarantee:
        </p>
        <ul className="mt-3">
          <li>nobody but the employee can change the card or send it as them</li>
          <li>
            when the card is removed, its link and QR code stop working everywhere, including forwarded copies. A Wallet
            pass already saved on someone&apos;s phone stays there, as passes do, but no longer updates.
          </li>
        </ul>
      </section>

      <section>
        <h2>Removing cards and leaving</h2>
        <ul>
          <li>
            <strong>Someone leaves:</strong> remove their card from the Employees page. It is permanently deleted from
            our database, along with its photo.
          </li>
          <li>
            <strong>An employee can remove their own card</strong> at any time from the app.
          </li>
          <li>
            <strong>Only the employee or your admin can do this.</strong> AIERT has no admin tool for deleting company
            cards, and the only ways to delete one need the card&apos;s edit key or an admin sign-in for that company.
          </li>
          <li>
            <strong>If billing lapses,</strong> existing cards keep working (we won&apos;t break cards your staff are
            already using), but no new invites can be created or used.
          </li>
          <li>
            <strong>To close your account</strong> and delete your company&apos;s data, email{" "}
            <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a> from an admin address.
          </li>
        </ul>
      </section>

      <section>
        <h2>Admin sign-in</h2>
        <ul>
          <li>
            No passwords to leak: admins sign in with a link emailed to them. It works once and expires after 15
            minutes.
          </li>
          <li>
            Opening the link doesn&apos;t sign you in until you press the button, so email security scanners that
            open links (such as Microsoft 365 Safe Links) can&apos;t use it up.
          </li>
          <li>
            Your session is a signed, secure, HTTP-only cookie that lasts 30 days, and scripts on the page can&apos;t
            read it.
          </li>
          <li>Each admin only ever sees and manages their own company.</li>
        </ul>
      </section>

      <section>
        <h2>Your company logo</h2>
        <p>
          You can upload a logo, or use <strong>Use logo from website</strong>. That button reads the public home
          page of the website in your template to find your logo, the same way link previews do. It only fetches public
          pages over HTTPS, never accepts SVG files (which can contain code), and checks the result is a real image
          before saving it.
        </p>
      </section>

      <section>
        <h2>Service providers</h2>
        <ul>
          <li>Vercel: hosts the TapCard website and API, and stores logos and card photos.</li>
          <li>Neon: hosts the database.</li>
          <li>Stripe: handles subscriptions and payments.</li>
          <li>Resend or Microsoft 365: sends admin sign-in emails.</li>
          <li>Apple and Google: Wallet passes, once an employee adds their card to their wallet.</li>
        </ul>
        <p className="mt-3">All connections to TapCard use HTTPS.</p>
      </section>

      <section>
        <h2>Roles and data protection</h2>
        <p>
          AIERT Ltd (registered in England &amp; Wales, No. 16587000) runs TapCard. Your company decides who to invite
          and what goes on your template. Each employee controls their own card once it&apos;s activated, as with any
          TapCard. Under UK data protection law, anyone can ask what we hold about them, or ask us to correct or delete
          it, by emailing <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a>, and can complain to the
          Information Commissioner&apos;s Office (ico.org.uk). If your organisation needs a data processing agreement
          or answers to a security questionnaire, email us.
        </p>
        <p className="mt-3">
          The general <a href="/privacy">TapCard privacy policy</a> covers the app and personal cards.
        </p>
      </section>

      <section>
        <h2>Reporting a security issue</h2>
        <p>
          If you think you&apos;ve found a security problem, email{" "}
          <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a> with &quot;Security&quot; in the subject.
          We&apos;ll look at it straight away.
        </p>
      </section>
    </DocPage>
  );
}
