import { before, test } from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs({ realSession: true });

import { NextRequest } from "next/server";
import { deriveCardId, proposedIdMatchesToken } from "../lib/tapcardCardId";

before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

// A phone works out its card's id from its edit token, so an offline QR can carry the link before the card is uploaded.
// These tests try to break that: claim someone else's link, overwrite a card, use a weak token, send a mismatching id.

const token = (n: number) => `${String(n).padStart(2, "0")}${"A".repeat(41)}`; // 43 chars like the apps send
let ip = 0;
const post = async (tok: string | null, body: Record<string, unknown>) => {
  const { POST } = await import("../app/api/tapcard/cards/route");
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}` };
  if (tok) headers.authorization = `Bearer ${tok}`;
  const res = await POST(new NextRequest("https://tapcard.test/api/cards", { method: "POST", body: JSON.stringify(body), headers }));
  return { status: res.status, body: (await res.json()) as Record<string, any> };
};
const card = (extra: Record<string, unknown> = {}) => ({ name: "Sam Patel", label: "Business", groupingID: `g-${Math.random()}`, ...extra });

test("the id is 22 url-safe characters, always the same for one token, different for another", () => {
  const a = deriveCardId(token(1));
  assert.match(a, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(a, deriveCardId(token(1)));
  assert.notEqual(a, deriveCardId(token(2)));
});

test("only the id the token itself produces is accepted; weak tokens and odd ids are not", () => {
  const t = token(3);
  assert.equal(proposedIdMatchesToken(deriveCardId(t), t), true);
  assert.equal(proposedIdMatchesToken(deriveCardId(token(4)), t), false);
  assert.equal(proposedIdMatchesToken("AAAAAAAAAAAAAAAAAAAAAA", t), false);
  assert.equal(proposedIdMatchesToken(deriveCardId("short"), "short"), false, "a short token could be guessed from the link");
  for (const bad of [undefined, null, 5, "", "tooshort", `${deriveCardId(t)}x`, "../../etc/passwd/xxxxxx", "a b c d e f g h i j k l"]) {
    assert.equal(proposedIdMatchesToken(bad, t), false, String(bad));
  }
});

test("a card uploaded with its own id gets exactly that id, and a retry updates it instead of duplicating", async () => {
  const t = token(10), id = deriveCardId(t);
  const first = await post(t, card({ proposedId: id }));
  assert.equal(first.status, 200);
  assert.equal(first.body.id, id);
  const again = await post(t, card({ proposedId: id, name: "Sam P Patel" }));
  assert.equal(again.status, 200);
  assert.equal(again.body.id, id);
  const { getCard } = await import("../lib/tapcardDb");
  assert.equal((await getCard(id))?.name, "Sam P Patel");
});

test("someone who only saw the link cannot register it, whatever token they use", async () => {
  const owner = token(20), id = deriveCardId(owner);
  // Before the owner's phone uploads: the id is on show in the offline QR code.
  const attacker = await post(token(21), card({ proposedId: id, name: "Fake Bank" }));
  assert.equal(attacker.status, 400);
  const { getCard } = await import("../lib/tapcardDb");
  assert.equal(await getCard(id), null, "nothing was created under the id on show");
  const real = await post(owner, card({ proposedId: id, name: "Real Owner" }));
  assert.equal(real.status, 200);
  assert.equal((await getCard(id))?.name, "Real Owner");
});

test("an existing card cannot be overwritten by proposing its id", async () => {
  const owner = token(30), id = deriveCardId(owner);
  assert.equal((await post(owner, card({ proposedId: id, name: "Owner" }))).status, 200);
  // A different token with the id in either field is refused, and the card is untouched.
  assert.equal((await post(token(31), card({ proposedId: id, name: "Evil" }))).status, 400);
  assert.equal((await post(token(31), card({ id, name: "Evil" }))).status, 403);
  assert.equal((await post(token(31), card({ id, proposedId: id, name: "Evil" }))).status, 400);
  const { getCard } = await import("../lib/tapcardDb");
  assert.equal((await getCard(id))?.name, "Owner");
});

test("the id and proposed id must agree, and a weak token is refused", async () => {
  const t = token(40);
  assert.equal((await post(t, card({ id: deriveCardId(token(41)), proposedId: deriveCardId(t) }))).status, 400);
  const weak = "weak-token-1234-weak-token-123456789"; // long enough for an ordinary upload, too short to hide an id
  assert.equal((await post(weak, card({ proposedId: deriveCardId(weak) }))).status, 400);
  assert.equal((await post(null, card({ proposedId: deriveCardId(t) }))).status, 401);
});

test("two uploads of the same card at the same moment leave one card and no error", async () => {
  const t = token(50), id = deriveCardId(t);
  const both = await Promise.all([post(t, card({ proposedId: id })), post(t, card({ proposedId: id }))]);
  assert.deepEqual(both.map((r) => r.status), [200, 200]);
  assert.deepEqual(both.map((r) => r.body.id), [id, id]);
});

test("without a proposed id nothing changes: the server still picks a random id", async () => {
  const res = await post(token(60), card());
  assert.equal(res.status, 200);
  assert.match(res.body.id, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(res.body.id, deriveCardId(token(60)));
});

test("a null proposed id counts as none, and the id a phone computes matches the server's", async () => {
  const res = await post(token(70), card({ proposedId: null }));
  assert.equal(res.status, 200);
  assert.match(res.body.id, /^[A-Za-z0-9_-]{22}$/);
  // Fixed vector, also computed by the iPhone and Android code: both must give this.
  assert.equal(deriveCardId("0123456789012345678901234567890123456789ABC"), "SlEAHdA-ti0_dMaMzYhDen");
});

test("a null id next to a proposed id is not a conflict (Android sends id: null on a first upload); a different real id is", async () => {
  const { idConflictsWithProposed } = await import("../lib/tapcardCardId");
  assert.equal(idConflictsWithProposed(undefined, "abc"), false);
  assert.equal(idConflictsWithProposed(null, "abc"), false);
  assert.equal(idConflictsWithProposed("abc", "abc"), false);
  assert.equal(idConflictsWithProposed("other", "abc"), true);
});
