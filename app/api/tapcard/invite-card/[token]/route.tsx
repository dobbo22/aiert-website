import sql from "@/lib/db";
import { type InviteCardPerson, inviteCardImage } from "@/lib/inviteCardImage";
import { ensureInviteSchema } from "@/lib/tapcardInvites";
import { inPhone } from "@/lib/phoneFrame";

// tapcard.aiert.co.uk/api/invite-card/<token>: the picture of the
// recipient's own card in their invite email (see lib/inviteCardImage.tsx).
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureInviteSchema();
  const person = ((await sql`
    SELECT c.name, c.company, c.email, c.phone, c.title, c.website, c.linkedin_url, c.facebook_url, c.x_url, c.instagram_url, c.photo_url, c.kind, c.address, c.booking_url, c.menu_url
    FROM tapcard_invite_sends s JOIN tapcard_invite_contacts c ON c.id = s.contact_id
    WHERE s.token = ${token}
  `) as InviteCardPerson[])[0];
  if (!person) return new Response("Not found", { status: 404 });
  const image = await inviteCardImage(person);
  // ?frame=1: the card on a phone screen (what the restaurant email shows).
  if (new URL(req.url).searchParams.get("frame") !== "1") return image;
  const framed = await inPhone(Buffer.from(await image.arrayBuffer()));
  return new Response(new Uint8Array(framed), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
