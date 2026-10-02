import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { type InviteCardPerson, inviteCardImage } from "@/lib/inviteCardImage";
import { ensureInviteSchema } from "@/lib/tapcardInvites";

// The same card picture for the Send tab's email preview (before there's a token).
export async function GET(_req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  if (!(await isAdminRequest())) return new Response("Unauthorized", { status: 401 });
  const id = Number((await params).contactId);
  if (!Number.isInteger(id)) return new Response("Bad id", { status: 400 });
  await ensureInviteSchema();
  const person = ((await sql`
    SELECT name, company, email, phone, title, website, linkedin_url, facebook_url, x_url, instagram_url, photo_url
    FROM tapcard_invite_contacts WHERE id = ${id}
  `) as InviteCardPerson[])[0];
  if (!person) return new Response("Not found", { status: 404 });
  // Not cached: the picture changes as soon as details are edited.
  const image = await inviteCardImage(person);
  return new Response(image.body, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
