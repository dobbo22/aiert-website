import crypto from "crypto";

// A card's id can be worked out by the owner's phone BEFORE the card is uploaded, so an offline QR code can carry the card's
// link while there is no signal (the link starts working once the phone uploads the card).
//
// The id is bound to the card's secret edit token: id = first 22 characters of base64url(SHA-256("tapcard-card-id-v1:" + token)).
// The link is public from the moment it is shown, but the token never leaves the owner's phone except as the upload's
// Authorization header, and the hash cannot be reversed. So:
//   - nobody who sees the link can register that id first (the server only accepts an id that matches the token sent with it);
//   - nobody can overwrite an existing card by proposing its id (an id only ever matches the token it was derived from, and an
//     existing card still needs its own edit token);
//   - a retry after a dropped connection is safe: the same token gives the same id, so the card is updated, not duplicated.
// 22 base64url characters carry 128 bits, the same strength as the server-chosen ids.

/** Shorter tokens could be guessed by someone who only has the link, so the proposed-id route refuses them. The apps send 43 characters. */
export const MIN_TOKEN_LENGTH_FOR_PROPOSED_ID = 40;

export function deriveCardId(editToken: string): string {
  return crypto.createHash("sha256").update(`tapcard-card-id-v1:${editToken}`).digest("base64url").slice(0, 22);
}

/** True only for an id the token itself produces (constant-time compare). */
export function proposedIdMatchesToken(proposedId: unknown, editToken: string): boolean {
  if (typeof proposedId !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(proposedId)) return false;
  if (editToken.length < MIN_TOKEN_LENGTH_FOR_PROPOSED_ID) return false;
  const expected = Buffer.from(deriveCardId(editToken));
  const given = Buffer.from(proposedId);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** A card upload may carry an `id` as well as a `proposedId`. An absent or null `id` (Android sends `"id": null` on a first upload) is
 *  no id at all; only a real, different `id` is a conflict. */
export function idConflictsWithProposed(id: unknown, proposedId: unknown): boolean {
  return id !== undefined && id !== null && id !== proposedId;
}
