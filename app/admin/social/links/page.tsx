import sql from "@/lib/db";
import { ensureInviteSchema } from "@/lib/tapcardInvites";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";
import { founderOffer } from "@/lib/tapcardFounders";
import InviteSender, { type SenderContact } from "./InviteSender";
import { isAdminRequest } from "@/lib/adminRequest";

export default async function SendInvitesPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  const route = inviteEmailRoute();
  const offer = await founderOffer();
  let contacts: SenderContact[] = [];
  let emailsSentToday = 0;
  let error: string | null = null;
  try {
    await ensureInviteSchema();
    contacts = (await sql`
      SELECT c.id, c.name, c.first_name, c.email, c.phone, c.company, c.linkedin_url, c.facebook_url,
             c.title, c.website, c.x_url, c.instagram_url, c.do_not_contact, c.photo_url,
             COALESCE(array_agg(DISTINCT s.channel) FILTER (WHERE s.id IS NOT NULL AND s.bounced_at IS NULL), '{}') AS channels,
             COALESCE(BOOL_OR(s.bounced_at IS NOT NULL), false) AS bounced,
             MAX(s.sent_at) AS last_sent_at,
             COALESCE(BOOL_OR(s.first_click_at IS NOT NULL), false) AS clicked
      FROM tapcard_invite_contacts c
      LEFT JOIN tapcard_invite_sends s ON s.contact_id = c.id
      WHERE NOT c.removed
      GROUP BY c.id
      ORDER BY lower(c.name)
    `) as SenderContact[];
    const today = (await sql`
      SELECT COUNT(*)::int AS n FROM tapcard_invite_sends
      WHERE channel = 'email' AND bounced_at IS NULL
        AND sent_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London')
    `) as { n: number }[];
    emailsSentToday = today[0]?.n ?? 0;
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't load contacts";
  }

  return (
    <div>
      {error && <p className="social-compose-error">{error}</p>}
      <InviteSender contacts={contacts} emailsSentToday={emailsSentToday} emailFrom={route.from} emailFromAddress={route.fromEmail} freeOffer={offer.line} offerSubject={offer.subject} />
    </div>
  );
}
