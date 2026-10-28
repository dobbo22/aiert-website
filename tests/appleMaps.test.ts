import { before, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { ctx, installStubs, sql } from "./helpers/pgdb";
installStubs();

import { NextRequest } from "next/server";

before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

const req = (url: string, init: { method?: string; body?: unknown } = {}) =>
  new NextRequest(`https://tapcard.test${url}`, { method: init.method ?? "GET", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { "content-type": "application/json" } });
const json = (r: Response) => r.json() as Promise<Record<string, any>>;

// A fake Apple: a token endpoint and a search that answers by query.
const calls: string[] = [];
function fakeApple(places: Record<string, unknown[]>) {
  (globalThis as { fetch: unknown }).fetch = async (input: string | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/v1/token")) return new Response(JSON.stringify({ accessToken: "tok" }), { status: 200 });
    if (url.includes("/v1/search")) {
      const q = decodeURIComponent(new URL(url).searchParams.get("q") ?? "");
      return new Response(JSON.stringify({ results: places[q] ?? [] }), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  };
}
const place = (id: string, name: string, lines: string[], lat: number, lng: number, category = "Store") => ({ id, name, formattedAddressLines: lines, poiCategory: category, coordinate: { latitude: lat, longitude: lng } });

function configure() {
  const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  process.env.APPLE_MAPS_KEY_P8 = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  process.env.APPLE_MAPS_KEY_ID = "TESTKEYID1";
  process.env.APPLE_MAPS_TEAM_ID = "TESTTEAM12";
}

test("Apple search: signs a token, lists places, and is empty when not set up or failing", async () => {
  const { appleSearch, appleMapsConfigured } = await import("../lib/appleMaps");
  delete process.env.APPLE_MAPS_KEY_P8;
  assert.equal(appleMapsConfigured(), false);
  assert.deepEqual(await appleSearch("The Rose Garden Dunmow"), []);
  configure();
  assert.equal(appleMapsConfigured(), true);
  fakeApple({ "The Rose Garden Dunmow": [place("A1", "The Rose Garden", ["16A High Street", "Dunmow", "CM6 1AG", "England"], 51.872, 0.363)] });
  const hits = await appleSearch("The Rose Garden Dunmow");
  assert.deepEqual(hits.map((h) => [h.id, h.name, h.address, h.type]), [["A1", "The Rose Garden", "16A High Street, Dunmow, CM6 1AG", "Store"]]);
  assert.ok(calls.some((c) => c.includes("/v1/token")), "asked Apple for a token");
  assert.deepEqual(await appleSearch("ab"), [], "too short to search");
  (globalThis as { fetch: unknown }).fetch = async () => { throw new Error("network down"); };
  assert.deepEqual(await appleSearch("The Rose Garden Dunmow"), [], "a failure is not an error");
});

test("the admin's place search lists from Apple, and a picked place is filled in by one Google lookup", async () => {
  configure();
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const places = await import("../app/api/tapcard/biz/places/route");
  const org = await createManagedCompany({ name: "Places Co", adminEmail: "a@places.example", locations: 2 });
  fakeApple({ "The Rose Garden Dunmow": [place("A1", "The Rose Garden", ["16A High Street", "Dunmow", "CM6 1AG"], 51.872, 0.363)] });
  ctx.session = { orgId: org.id, email: "a@places.example" };
  const list = await json(await places.GET(req("/x?q=The%20Rose%20Garden%20Dunmow")));
  assert.equal(list.source, "apple");
  assert.equal(list.hits[0].name, "The Rose Garden");
  assert.equal(list.hits[0].website, "", "Apple gives no website");
  // with no Google key in the test, the detail lookup finds nothing: the hit comes back unchanged, not as an error
  const detail = await json(await places.POST(req("/x", { method: "POST", body: { name: "The Rose Garden", address: "16A High Street, Dunmow, CM6 1AG" } })));
  assert.equal(detail.found, false);
  assert.equal(detail.hit.name, "The Rose Garden");
  assert.equal((await places.POST(req("/x", { method: "POST", body: { address: "x" } }))).status, 400);
  ctx.session = null;
  assert.equal((await places.GET(req("/x?q=abc"))).status, 401);
  assert.equal((await places.POST(req("/x", { method: "POST", body: { name: "x" } }))).status, 401);
});

test("finding other shops: Apple places with the company's name nearby, not far away, not different names, not ones already added", async () => {
  configure();
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { createLocation } = await import("../lib/tapcardBizLocations");
  const discover = await import("../app/api/tapcard/biz/locations/discover/route");
  const org = await createManagedCompany({ name: "The Rose Garden", adminEmail: "a@rosey.example", locations: 3 });
  await createLocation(org.id, { name: "The Rose Garden", address: "16A High Street, Great Dunmow, Dunmow CM6 1AG", phone: "", email: "", website: "", links: [] });
  const dunmow = place("D", "The Rose Garden", ["16A High Street", "Dunmow", "CM6 1AG"], 51.872, 0.363);
  const bardfield = place("B", "The Rose Garden", ["Braintree Road", "Great Bardfield", "Braintree", "CM7 4PY"], 51.9, 0.43);   // about 5 km
  const bristol = place("X", "The Rose Garden", ["1 Park St", "Bristol", "BS1 5AA"], 51.45, -2.6);                                  // far away
  const cafe = place("C", "Rose Garden Cafe & Bar", ["2 High St", "Dunmow", "CM6 1AB"], 51.873, 0.364, "Restaurant");               // a similar name, a different kind of place
  const sameName = place("S", "The Rose Garden Florist", ["9 Mill Lane", "Thaxted", "CM6 2LW"], 51.95, 0.34);                         // about 10 km, starts with the name
  fakeApple({
    "The Rose Garden Great Dunmow Dunmow": [dunmow],
    "The Rose Garden": [dunmow, bardfield, bristol, cafe, sameName],
  });
  ctx.session = { orgId: org.id, email: "a@rosey.example" };
  const res = await json(await discover.POST(req("/x", { method: "POST", body: {} })));
  const names = res.candidates.map((c: { name: string; address: string; source: string }) => `${c.name} | ${c.address} | ${c.source}`);
  assert.ok(names.some((n: string) => n.includes("Braintree Road") && n.endsWith("Apple Maps")), "Great Bardfield is found");
  assert.ok(names.some((n: string) => n.includes("Thaxted")), "a florist of the same name nearby");
  assert.ok(!names.some((n: string) => n.includes("Bristol")), "far away is left out");
  assert.ok(!names.some((n: string) => n.includes("Cafe")), "a different kind of place is left out");
  assert.ok(!names.some((n: string) => n.includes("16A High Street")), "the shop already added is left out");
  assert.ok(res.candidates.every((c: { website: string }) => c.website === ""), "details are filled in only when a shop is added");
  ctx.session = null;
});

test("a picked shop's details come from TomTom, then HERE, filling in what is missing; only the same shop counts", async () => {
  process.env.TOMTOM_API_KEY = "tt-key"; process.env.HERE_API_KEY = "here-key";
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const places = await import("../app/api/tapcard/biz/places/route");
  const org = await createManagedCompany({ name: "Providers Co", adminEmail: "a@prov.example", locations: 2 });
  ctx.session = { orgId: org.id, email: "a@prov.example" };
  const used: string[] = [];
  const tomtom = (poi: unknown) => ({ results: poi ? [poi] : [] });
  const setup = (tt: unknown, here: unknown) => {
    used.length = 0;
    (globalThis as { fetch: unknown }).fetch = async (input: string | URL) => {
      const url = String(input);
      if (url.includes("api.tomtom.com")) { used.push("tomtom"); return new Response(JSON.stringify(tomtom(tt)), { status: 200 }); }
      if (url.includes("hereapi.com")) { used.push("here"); assert.match(url, /discover\.search\.hereapi\.com\/v1\/discover/); assert.match(url, /at=51\.8722,0\.3629/); return new Response(JSON.stringify({ items: here ? [here] : [] }), { status: 200 }); }
      return new Response("{}", { status: 404 });
    };
  };
  const ask = async () => json(await places.POST(req("/x", { method: "POST", body: { name: "The Rose Garden", address: "16A High Street, Dunmow, CM6 1AG", lat: 51.8722, lng: 0.3629 } })));
  const ttPlace = { poi: { name: "The Rose Garden", phone: "+44 1371 872882", url: "www.therosegardenflorists.co.uk" }, address: { freeformAddress: "16A High Street, Dunmow", postalCode: "CM6 1AG" } };
  const herePlace = { title: "The Rose Garden", address: { label: "16A High St, Dunmow, CM6 1AG", postalCode: "CM6 1AG" }, contacts: [{ phone: [{ value: "+44 1371 872882" }], www: [{ value: "http://business.data.gov.uk/id/company/09745942" }, { value: "https://www.facebook.com/490512074460597" }, { value: "http://www.therosegardenflorists.co.uk" }, { value: "https://www.therosegardenflorists.co.uk" }] }], openingHours: [{ text: ["Mon-Fri: 09:30 - 17:00", "Sat: 09:30 - 15:00"] }] };

  // TomTom has everything we need: HERE and Google are not asked
  setup(ttPlace, herePlace);
  let r = await ask();
  assert.equal(r.found, true);
  assert.equal(r.hit.website, "https://www.therosegardenflorists.co.uk");
  assert.equal(r.hit.phone, "+44 1371 872882");
  assert.equal(r.hit.source, "tomtom");
  assert.deepEqual(used, ["tomtom"]);

  // TomTom has a phone but no website: HERE fills in the website and the hours
  setup({ ...ttPlace, poi: { ...ttPlace.poi, url: "" } }, herePlace);
  r = await ask();
  assert.equal(r.hit.source, "tomtom+here");
  assert.equal(r.hit.website, "https://www.therosegardenflorists.co.uk", "the business's own site, not Facebook or the company record");
  assert.equal(r.hit.hours, "Mon–Fri: 09:30–17:00; Sat: 09:30–15:00");
  assert.deepEqual(used, ["tomtom", "here"]);

  // TomTom finds another place at a different postcode: not our shop, so HERE is used
  setup({ ...ttPlace, address: { freeformAddress: "1 Other Rd, Elsewhere", postalCode: "BS1 5AA" } }, herePlace);
  r = await ask();
  assert.equal(r.hit.source, "here");

  // neither knows it (and there is no Google key here): nothing found, not an error
  setup(null, null);
  r = await ask();
  assert.equal(r.found, false);
  assert.deepEqual(used, ["tomtom", "here"]);

  // a failing provider is skipped
  (globalThis as { fetch: unknown }).fetch = async (input: string | URL) => { if (String(input).includes("tomtom")) throw new Error("down"); return new Response(JSON.stringify({ items: [herePlace] }), { status: 200 }); };
  r = await ask();
  assert.equal(r.hit.source, "here");

  // without keys they are skipped silently
  delete process.env.TOMTOM_API_KEY; delete process.env.HERE_API_KEY;
  setup(ttPlace, herePlace);
  r = await ask();
  assert.equal(r.found, false);
  assert.deepEqual(used, []);
  ctx.session = null;
});

test("Google's review link: found with an ID-only search near Apple's position, else the full search", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "g-key";
  configure();
  const { findReviewLinks } = await import("../lib/reviewLookup");
  const googleCalls: { mask: string; body: Record<string, any> }[] = [];
  const go = (apple: unknown[], googleIdOnly: unknown[], googleFull: unknown[]) => {
    googleCalls.length = 0;
    (globalThis as { fetch: unknown }).fetch = async (input: string | URL, init?: { headers?: Record<string, string>; body?: string }) => {
      const url = String(input);
      if (url.includes("/v1/token")) return new Response(JSON.stringify({ accessToken: "tok" }), { status: 200 });
      if (url.includes("maps-api.apple.com/v1/search")) return new Response(JSON.stringify({ results: apple }), { status: 200 });
      if (url.includes("places.googleapis.com")) {
        const mask = init?.headers?.["X-Goog-FieldMask"] ?? "";
        googleCalls.push({ mask, body: JSON.parse(init?.body ?? "{}") });
        return new Response(JSON.stringify({ places: mask === "places.id" ? googleIdOnly : googleFull }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    };
  };
  const rose = place("A1", "The Rose Garden", ["16A High Street", "Dunmow", "CM6 1AG"], 51.8722, 0.3629);

  // Apple knows it: one Google call, ID only, restricted to a small box around the shop
  go([rose], [{ id: "ChIJidonly" }], []);
  let r = await findReviewLinks("The Rose Garden", "16A High Street, Dunmow, CM6 1AG", "");
  assert.equal(r.google, "https://search.google.com/local/writereview?placeid=ChIJidonly");
  assert.equal(googleCalls.length, 1);
  assert.equal(googleCalls[0].mask, "places.id", "no paid fields asked for");
  const box = googleCalls[0].body.locationRestriction.rectangle;
  assert.ok(Math.abs((box.low.latitude + box.high.latitude) / 2 - 51.8722) < 0.0001);
  assert.ok(box.high.latitude - box.low.latitude < 0.005, "a box of a few hundred metres, not a town");

  // a different shop is asked about: Apple has no match, so the full search runs and decides
  go([], [], [{ id: "ChIJfull", displayName: { text: "Corner Bakery" }, formattedAddress: "2 Mill Lane, Thaxted, CM6 2LW", websiteUri: "" }]);
  r = await findReviewLinks("Corner Bakery", "2 Mill Lane, Thaxted, CM6 2LW", "");
  assert.equal(r.google, "https://search.google.com/local/writereview?placeid=ChIJfull");
  assert.equal(googleCalls.length, 1);
  assert.notEqual(googleCalls[0].mask, "places.id");

  // Apple knows it but Google finds nothing near it: falls back to the full search
  go([place("A2", "Harbour Cafe", ["5 Quay Rd", "Maldon", "CM9 5AA"], 51.73, 0.67)], [], []);
  r = await findReviewLinks("Harbour Cafe", "5 Quay Rd, Maldon, CM9 5AA", "");
  assert.equal(r.google, undefined);
  assert.equal(googleCalls.length, 2, "ID-only first, then the full search");
  // the answer is remembered: asking again costs nothing
  go([], [], []);
  await findReviewLinks("The Rose Garden", "16A High Street, Dunmow, CM6 1AG", "");
  assert.equal(googleCalls.length, 0);
  delete process.env.GOOGLE_PLACES_API_KEY;
});
