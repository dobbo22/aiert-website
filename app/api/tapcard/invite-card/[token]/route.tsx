import sql from "@/lib/db";
import { inviteCardImage } from "@/lib/inviteCardImage";
import { ensureInviteSchema } from "@/lib/tapcardInvites";

// tapcard.aiert.co.uk/api/invite-card/<token>: the picture of the
// recipient's own card in their invite email (see lib/inviteCardImage.tsx).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureInviteSchema();
  const person = ((await sql`
    SELECT c.name, c.company, c.email, c.phone
    FROM tapcard_invite_sends s JOIN tapcard_invite_contacts c ON c.id = s.contact_id
    WHERE s.token = ${token}
  `) as { name: string; company: string; email: string; phone: string }[])[0];
  if (!person) return new Response("Not found", { status: 404 });
  return inviteCardImage(person);
}
