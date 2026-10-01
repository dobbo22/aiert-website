import sql from "@/lib/db";
import { ensureInviteSchema } from "@/lib/tapcardInvites";
import InviteSender, { type SenderContact } from "./InviteSender";

export default async function SendInvitesPage() {
  let contacts: SenderContact[] = [];
  let emailsSentToday = 0;
  let error: string | null = null;
  try {
    await ensureInviteSchema();
    contacts = (await sql`
      SELECT c.id, c.name, c.first_name, c.email, c.phone, c.company, c.do_not_contact,
             COALESCE(array_agg(DISTINCT s.channel) FILTER (WHERE s.id IS NOT NULL), '{}') AS channels,
             MAX(s.sent_at) AS last_sent_at,
             COALESCE(BOOL_OR(s.first_click_at IS NOT NULL), false) AS clicked
      FROM tapcard_invite_contacts c
      LEFT JOIN tapcard_invite_sends s ON s.contact_id = c.id
      GROUP BY c.id
      ORDER BY lower(c.name)
    `) as SenderContact[];
    const today = (await sql`
      SELECT COUNT(*)::int AS n FROM tapcard_invite_sends
      WHERE channel = 'email'
        AND sent_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London')
    `) as { n: number }[];
    emailsSentToday = today[0]?.n ?? 0;
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't load contacts";
  }

  return (
    <div>
      <p className="admin-mailbroom-note">
        Send TapCard to people in your contacts, each with their own tracked link
        (<code>tapcard.aiert.co.uk/i/…</code>), so the <strong>Track invites</strong> tab can
        show who clicked through. Emails go out one at a time from martin@mailbroom.app (Outlook),
        at most 100 a day: tick people, press <strong>Review &amp; email</strong>, then check and
        personalise each one before Send (Send stays locked until the [personalise here…] line is
        replaced). WhatsApp opens WhatsApp with the message ready, and you
        press Send there. Personalise with{" "}
        <code>{"{firstName}"}</code>, <code>{"{name}"}</code>, <code>{"{company}"}</code>,{" "}
        <code>{"{link}"}</code> (their own link), <code>{"{shareLink}"}</code> (a pass-it-on link:
        clicks on it count as referrals by them), <code>{"{androidLink}"}</code> (their &quot;tell me when it&apos;s on
        Android&quot; link) and <code>{"{howItWorksLink}"}</code>. In emails, <code>[label](url)</code> makes a link,
        lines starting <code>- </code> are bullets and <code>**bold**</code> is bold.
      </p>
      {error && <p className="social-compose-error">{error}</p>}
      <InviteSender contacts={contacts} emailsSentToday={emailsSentToday} />
    </div>
  );
}
