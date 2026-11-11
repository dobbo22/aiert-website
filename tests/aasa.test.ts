import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/tapcard/aasa/route";

// The app-link file decides which links open an app. A mistake here breaks every TapCard link, so its shape is pinned.
const file = async (host: string) => (await (GET(new Request("https://x.test/", { headers: { host } })) as Response).json()) as {
  appclips: { apps: string[] };
  applinks: { details: { appID: string; paths: string[] }[] };
};

test("TapCard's own links are unchanged and the details hand-back is added", async () => {
  const f = await file("tapcard.aiert.co.uk");
  const app = f.applinks.details.find((d) => d.appID === "ATMHQQQQ5S.com.mailbroom.tapcard")!;
  assert.deepEqual(app.paths, ["NOT /c/*/vcard", "/c/*", "/business/claim", "/start/*", "/details"]);
  assert.deepEqual(f.appclips.apps, ["ATMHQQQQ5S.com.mailbroom.tapcard.Clip"]);
  assert.equal(f.applinks.details.length, 1, "PowerSearch is not listed on the TapCard host");
});

test("on www.aiert.co.uk TapCard keeps its /tapcard prefix and PowerSearch gets its two hand-over paths", async () => {
  const f = await file("www.aiert.co.uk");
  const app = f.applinks.details.find((d) => d.appID === "ATMHQQQQ5S.com.mailbroom.tapcard")!;
  assert.deepEqual(app.paths, ["NOT /tapcard/c/*/vcard", "/tapcard/c/*", "/tapcard/business/claim", "/tapcard/start/*", "/tapcard/details"]);
  const ps = f.applinks.details.find((d) => d.appID === "ATMHQQQQ5S.com.mailbroom.powersearch")!;
  assert.deepEqual(ps.paths, ["/powersearch/sender", "/powersearch/details"]);
});
