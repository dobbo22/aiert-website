import { before, test } from "node:test";
import assert from "node:assert/strict";
import { ctx, installStubs } from "./helpers/pgdb";
installStubs();

import { NextRequest } from "next/server";

const req = (method: string, body?: unknown, url = "/api/admin/tapcard/walkin") =>
  new NextRequest(`https://www.aiert.co.uk${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } });

before(async () => { const { getPrebuilt } = await import("../lib/tapcardPrebuilt"); await getPrebuilt("x".repeat(20)); });

test("the walk-in demo is for the admin only", async () => {
  const route = await import("../app/api/admin/tapcard/walkin/route");
  ctx.admin = false;
  assert.equal((await route.GET(req("GET", undefined, "/api/admin/tapcard/walkin?q=cafe"))).status, 401);
  assert.equal((await route.POST(req("POST", { name: "Cafe" }))).status, 401);
  assert.equal((await route.PUT(req("PUT", { token: "x", email: "a@b.co" }))).status, 401);
  ctx.admin = true;
});

test("a built walk-in card's start link can be emailed to the prospect, and only a good address and a live card work", async () => {
  const route = await import("../app/api/admin/tapcard/walkin/route");
  const { storePrebuilt } = await import("../lib/tapcardPrebuilt");
  ctx.admin = true;
  const card = { name: "Salon Rose", company: "Salon Rose", website: "https://salonrose.example", address: "1 High St", phone: "01", label: "Business", cardKind: "business" as const, links: [], facebookUrl: "", instagramUrl: "", twitterUrl: "", linkedInUrl: "", tiktokUrl: "", branchCount: 0 };
  const token = await storePrebuilt("walk-in@aiert.co.uk", "Salon Rose", card.website, card, null, "");
  assert.equal((await route.PUT(req("PUT", { token, email: "not an email" }))).status, 400);
  assert.equal((await route.PUT(req("PUT", { token: "doesnotexist0000000000", email: "owner@salonrose.example" }))).status, 404);
  ctx.outbox.length = 0;
  const ok = await route.PUT(req("PUT", { token, email: "owner@salonrose.example" }));
  assert.equal(ok.status, 200);
  assert.equal(ctx.outbox.length, 1);
  assert.equal(ctx.outbox[0].to, "owner@salonrose.example");
  assert.ok(ctx.outbox[0].html.includes(`https://tapcard.aiert.co.uk/start/${token}`), "the email carries the start link");
  assert.ok(ctx.outbox[0].subject.includes("Salon Rose"));
  assert.ok(ctx.outbox[0].html.includes("3 months free") && ctx.outbox[0].text.includes("£49.99 a year"), "the email says what costs money");
});

test("the MapKit JS token is signed for the admin's own origin and only for the admin", async () => {
  const { generateKeyPairSync, createVerify } = await import("node:crypto");
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  process.env.APPLE_MAPS_KEY_P8 = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  process.env.APPLE_MAPS_KEY_ID = "KEY123";
  process.env.APPLE_MAPS_TEAM_ID = "TEAM123";
  const { mapkitJsToken } = await import("../lib/appleMaps");
  const t = mapkitJsToken("https://www.aiert.co.uk")!;
  const [h, p, sig] = t.split(".");
  assert.equal(JSON.parse(Buffer.from(h, "base64url").toString()).kid, "KEY123");
  const body = JSON.parse(Buffer.from(p, "base64url").toString());
  assert.equal(body.iss, "TEAM123");
  assert.equal(body.origin, "https://www.aiert.co.uk");
  assert.ok(body.exp - body.iat <= 1800);
  assert.ok(createVerify("sha256").update(`${h}.${p}`).verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url")), "a valid ES256 signature");

  const route = await import("../app/api/admin/tapcard/mapkit-token/route");
  const call = () => route.GET(new NextRequest("https://www.aiert.co.uk/api/admin/tapcard/mapkit-token", { headers: { host: "www.aiert.co.uk" } }));
  ctx.admin = false;
  assert.equal((await call()).status, 401);
  ctx.admin = true;
  assert.equal((await call()).status, 200);
  assert.equal((await route.GET(new NextRequest("https://evil.example/api/admin/tapcard/mapkit-token", { headers: { host: "evil.example" } }))).status, 400, "not for other hosts");
});
