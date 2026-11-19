import test from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

test("third-party regulatory news hosts are recognised, the company's own site is not", async () => {
  const { isThirdPartyRegulatoryUrl: is } = await import("../lib/tapcardRegulatoryHosts");
  assert.ok(is("https://www.londonstockexchange.com/news-article/KEFI/results/123"));
  assert.ok(is("https://rns-pdf.londonstockexchange.com/rns/1234.pdf"));
  assert.ok(is("https://www.investegate.co.uk/announcement/rns/kefi/results/1"));
  assert.ok(is("investegate.co.uk/company/KEFI"));
  assert.ok(is("https://uk.advfn.com/stock-market/LSE/KEFI/news"));
  assert.equal(is("https://www.kefi.com/investors/rns/results"), false);
  assert.equal(is("https://notinvestegate.co.uk/x"), false);
  assert.equal(is("https://investegate.co.uk.evil.com/x"), false);
  assert.equal(is("not a url at all"), false);
});

test("the feed page and its items refuse RNS hosts, and a headline link to one is refused", async () => {
  const { isThirdPartyRegulatoryUrl, THIRD_PARTY_MESSAGE } = await import("../lib/tapcardRegulatoryHosts");
  assert.ok(THIRD_PARTY_MESSAGE.includes("own website"));
  await (await import("../lib/tapcardDb")).getCard("none");
  const { ensurePolicySchema } = await import("../lib/tapcardNewsPolicy");
  await ensurePolicySchema();
  const org = (await (await import("../lib/tapcardBiz")).createOrg("Hosts Test", "hosts.example")).id;
  const f = await import("../lib/tapcardNewsFlow");
  const posts: unknown[] = [];
  const post = async (p: unknown) => { posts.push(p); return { ok: true as const }; };
  for (const kind of ["general", "rns"] as const) {
    const r = await f.submitNews({ actor: { orgId: org, email: "ceo@kefi.com" }, cardId: "card-x", kind, text: "Results", link: "https://www.investegate.co.uk/announcement/rns/kefi/results/1", groups: [], override: true, post });
    assert.equal(r.ok === false && r.code, "third_party_link");
  }
  assert.equal(posts.length, 0, "nothing was posted, even with override");
  assert.equal(isThirdPartyRegulatoryUrl("https://kefi.com/rns/x"), false);
});
