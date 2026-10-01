import sql from "@/lib/db";
import { ensureInviteSchema } from "@/lib/tapcardInvites";
import InviteSender, { type SenderContact } from "./InviteSender";

export default async function SendInvitesPage() {
  let contacts: SenderContact[] = [];
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
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't load contacts";
  }

  return (
    <div>
      <p className="admin-mailbroom-note">
        Send TapCard to people in your contacts, each with their own tracked link
        (<code>tapcard.aiert.co.uk/i/…</code>), so the <strong>Track invites</strong> tab can
        show who opened and clicked through. Emails go out from Martin via Resend. WhatsApp
        opens WhatsApp with the message ready, and you press Send. Personalise with{" "}
        <code>{"{firstName}"}</code>, <code>{"{name}"}</code>, <code>{"{company}"}</code> and{" "}
        <code>{"{link}"}</code>.
      </p>
      {error && <p className="social-compose-error">{error}</p>}
      <InviteSender contacts={contacts} />
    </div>
  );
}
