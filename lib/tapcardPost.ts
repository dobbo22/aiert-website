import { NextRequest, NextResponse } from "next/server";
import { getCard, type TapCardRecord } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { posterMayPostFor } from "@/lib/tapcardBiz";

// Who is posting an offer or news line for a card (`target`)?
//  - The target card's own phone (its edit token), if it is allowed to post for itself; or
//  - a different card of the same company whose owner the admin has allowed to post for this location. That phone sends
//    its OWN edit token plus the header "X-TapCard-Poster: <its own card id>".
// Returns the poster's card id (recorded on the offer, for the one-live-offer rule) or the error to send back.
export type PosterResult = { ok: true; posterId: string } | { ok: false; response: NextResponse };

const ADMIN_ONLY = "Offers and news for this company are posted by its admin, or by the people the admin has allowed to post for this location.";

export async function authorizePoster(req: NextRequest, target: TapCardRecord): Promise<PosterResult> {
  const token = readEditToken(req);
  if (await canEdit(target, token)) {
    if (!(await posterMayPostFor(target.id, target.id))) {
      return { ok: false, response: NextResponse.json({ error: ADMIN_ONLY, code: "admin_only" }, { status: 403 }) };
    }
    return { ok: true, posterId: target.id };
  }
  const posterId = req.headers.get("x-tapcard-poster");
  if (posterId && posterId !== target.id) {
    const poster = await getCard(posterId);
    if (poster && (await canEdit(poster, token)) && (await posterMayPostFor(posterId, target.id))) return { ok: true, posterId };
    if (poster && (await canEdit(poster, token))) {
      return { ok: false, response: NextResponse.json({ error: ADMIN_ONLY, code: "admin_only" }, { status: 403 }) };
    }
  }
  return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
}

export async function posterName(postedBy: string): Promise<string> {
  if (postedBy === "admin") return "your company's admin";
  const c = await getCard(postedBy);
  return c?.name || "a colleague";
}
