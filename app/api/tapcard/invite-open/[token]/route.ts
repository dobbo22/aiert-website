import sql from "@/lib/db";
import { ensureInviteSchema } from "@/lib/tapcardInvites";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

// 1x1 open-tracking pixel in invite emails. Approximate at best: Apple Mail
// Privacy Protection pre-loads images (so opens can be counted for unread
// mail) and many clients block images (so real opens can be missed).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    await ensureInviteSchema();
    await sql`UPDATE tapcard_invite_sends SET opened_at = COALESCE(opened_at, now()) WHERE token = ${token}`;
  } catch {
    // Never fail the image over tracking.
  }
  return new Response(new Uint8Array(GIF), {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" },
  });
}
