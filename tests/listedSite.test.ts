import { test } from "node:test";
import assert from "node:assert/strict";
import { guessDomains, judgeWebsite } from "../lib/listedSiteJudge";

const filler = "Investor relations regulatory news annual report and accounts. ".repeat(12);
const page = (title: string, body = filler, finalUrl = "https://example.com/", status = 200) => ({ finalUrl, status, html: `<html><head><title>${title}</title></head><body><h1>${title}</h1><p>${body}</p></body></html>` });
const co = (n: string, t = "XYZ", i = "GB0000000000") => ({ n, t, i });

test("a page that names the company in its title passes", () => {
  const j = judgeWebsite(co("Kefi Gold and Copper plc", "KEFI", "GB00BD8GP619"), page("KEFI Gold and Copper | Home", filler, "https://www.kefi-goldandcopper.com/"));
  assert.equal(j.verdict, "ok");
});

test("a different company's page is wrong", () => {
  assert.equal(judgeWebsite(co("Kefi Gold and Copper plc"), page("Acme Holdings | Home")).verdict, "wrong");
});

test("a page that only mentions the name in its text is left for a person to decide", () => {
  const j = judgeWebsite(co("Zebra Mining plc"), page("Welcome", `${filler} Our investor Zebra Mining plc is listed on AIM.`, "https://news.example.org/"));
  assert.equal(j.verdict, "unsure");
});

test("the ISIN on the page is enough", () => {
  assert.equal(judgeWebsite(co("Zebra Mining plc", "ZEB", "GB00BZEBRA01"), page("Welcome", `${filler} ISIN GB00BZEBRA01`)).verdict, "ok");
});

test("parked, empty and failing pages are recognised", () => {
  assert.equal(judgeWebsite(co("Zebra Mining plc"), page("zebramining.com", "This domain is for sale. Buy this domain today.")).verdict, "parked");
  assert.equal(judgeWebsite(co("Zebra Mining plc"), { finalUrl: "https://x.com", status: 0, html: "" }).verdict, "dead");
  assert.equal(judgeWebsite(co("Zebra Mining plc"), { finalUrl: "https://x.com", status: 404, html: "" }).verdict, "dead");
});

test("domain guesses come from the distinctive words only", () => {
  assert.deepEqual(guessDomains("Zebra Mining plc").slice(0, 2), ["https://www.zebramining.com", "https://www.zebramining.co.uk"]);
  assert.deepEqual(guessDomains("plc"), []);
});

test("abbreviated and cut-off list names still match (HSBC Hldgs plc)", () => {
  const j = judgeWebsite(co("HSBC Hldgs plc", "HSBA", "GB0005405286"), page("HSBC Group corporate website | HSBC Holdings plc", filler, "https://www.hsbc.com/"));
  assert.equal(j.verdict, "ok");
  assert.equal(judgeWebsite(co("Jpmorgan Global Core Real Assets Li"), page("JPMorgan Global Core Real Assets Limited | Home", filler, "https://am.jpmorgan.com/")).verdict, "ok");
  assert.equal(judgeWebsite(co("HSBC Hldgs plc"), page("Lloyds Bank | Personal banking", filler, "https://www.lloydsbank.com/")).verdict, "wrong");
});

test("a site drawn by script (almost no text) is not called parked when its title is the company's (Shell)", () => {
  const shell = { finalUrl: "https://www.shell.com/", status: 200, html: "<html><head><title>Shell Global</title></head><body><div id='app'></div><script>boot()</script></body></html>" };
  const j = judgeWebsite(co("Shell plc", "SHEL", "GB00BP6MXD84"), shell);
  assert.equal(j.verdict, "ok");
  assert.equal(judgeWebsite(co("Zebra Mining plc"), { finalUrl: "https://zebramining.com/", status: 200, html: "<html><head><title>zebramining.com</title></head><body><p>hi</p></body></html>" }).verdict, "ok");
  assert.equal(judgeWebsite(co("Shell plc"), { finalUrl: "https://example.org/", status: 200, html: "<html><head><title>Welcome</title></head><body><p>hi</p></body></html>" }).verdict, "parked");
});

test("a Cloudflare challenge page is 'needs a look', not dead or parked (1947 plc)", () => {
  const j = judgeWebsite(co("1947 Oil & Gas plc"), { finalUrl: "https://1947plc.com/", status: 403, html: "<html><head><title>Just a moment...</title></head><body>Enable JavaScript and cookies to continue</body></html>" });
  assert.equal(j.verdict, "unsure");
  assert.match(j.reasons[0], /refuses automated readers/);
});
