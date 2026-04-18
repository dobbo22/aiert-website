import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – MailBroom | AIERT Ltd",
  description: "MailBroom privacy policy. Your emails never leave your device. No tracking, no analytics, no external servers.",
  metadataBase: new URL("https://aiert.co.uk"),
};

export default function MailBroomPrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-gray-900">
      <h1 className="text-3xl font-bold mb-2">MailBroom – Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: 18 April 2026 · AIERT Ltd</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed">
          MailBroom is designed with privacy as a first principle. Your emails are processed entirely
          on your device and are never transmitted to any server operated by AIERT Ltd or any third
          party. There is no MailBroom backend.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Data We Do Not Collect</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Email content, subject lines or sender addresses</li>
          <li>Your IMAP credentials (stored only in the iOS Keychain on your device)</li>
          <li>Usage analytics or behavioural data</li>
          <li>Advertising identifiers or tracking data</li>
          <li>Device identifiers beyond what Apple provides to the App Store</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">How MailBroom Works</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>
            <strong>IMAP connection:</strong> MailBroom connects directly from your device to your
            own mail server (Gmail, Outlook, iCloud, or any IMAP server). No email data passes
            through our servers.
          </li>
          <li>
            <strong>AI classification:</strong> Email classification uses an on-device Naive Bayes
            model. The model learns from your corrections and is stored locally. It is never
            uploaded or shared.
          </li>
          <li>
            <strong>Credentials:</strong> Your email password is stored exclusively in the iOS
            Keychain using Apple's secure storage APIs. It is never stored in plain text or
            transmitted to any party other than your own mail server.
          </li>
          <li>
            <strong>Unsubscribe requests:</strong> When you use Smart Unsubscribe, MailBroom sends
            an opt-out request directly from your device to the mailing list's unsubscribe URL
            (as specified in the email's List-Unsubscribe header). No data passes through our
            servers.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Subscriptions &amp; Billing</h2>
        <p className="text-gray-700 leading-relaxed">
          MailBroom Pro is an auto-renewable subscription managed entirely by Apple through the App
          Store. AIERT Ltd does not receive or store any payment card details. All billing queries
          should be directed to Apple Support.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Notifications</h2>
        <p className="text-gray-700 leading-relaxed">
          MailBroom may send local notifications (scan complete summary, daily digest). These are
          generated on your device and do not involve any external service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Children</h2>
        <p className="text-gray-700 leading-relaxed">
          MailBroom is rated 4+ on the App Store. We do not knowingly collect any data from any
          user, including children under 13.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
        <p className="text-gray-700 leading-relaxed">
          If we make material changes to this policy, we will update the date at the top of this
          page and, where appropriate, notify users via an in-app notice.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          For privacy-related questions, contact AIERT Ltd at{" "}
          <a href="mailto:privacy@aiert.co.uk" className="text-blue-600 underline">
            privacy@aiert.co.uk
          </a>
          .
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-12 border-t pt-6">
        © {new Date().getFullYear()} AIERT Ltd. Registered in England &amp; Wales.
      </p>
    </main>
  );
}
