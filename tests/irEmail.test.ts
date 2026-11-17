import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIrEmail } from "../lib/tapcardIrEmail";

const LINK = "https://tapcard.aiert.co.uk/investors?v=abc1234567";
const KINDS = ["company", "agency", "broker", "contact"] as const;
const BANNED = /free app|free TapCard app|no app needed|£|KEFI|SparkLive|LSEG/i;

test("IR emails: every type and step carries the personal link and keeps to the wording rules", () => {
  for (const kind of KINDS) {
    const first = buildIrEmail({ name: "Dr Alexandra Reed", org: "Example Resources plc", kind, link: LINK });
    assert.ok(first.text.includes(LINK) && first.html.includes(LINK), `${kind}: link in text and html`);
    assert.match(first.html, /tapcard-ir-demo-thumb-v3\.png/, `${kind}: video picture`);
    assert.match(first.text, /TapCard does not provide RNS/, `${kind}: RNS caveat`);
    assert.match(first.text, /still being built/, `${kind}: honest about unbuilt parts`);
    assert.match(first.text, /^Hi Alexandra,/, `${kind}: first name, not the title`);
    assert.doesNotMatch(first.subject + first.text + first.html, BANNED, `${kind}: banned wording`);
    assert.ok(first.subject.length < 100);

    const follow = buildIrEmail({ name: "Dr Alexandra Reed", org: "Example Resources plc", kind, link: LINK, step: "followup" });
    assert.match(follow.subject, /^Following up: /);
    assert.doesNotMatch(follow.subject + follow.text + follow.html, BANNED, `${kind} follow-up: banned wording`);
    assert.match(follow.text, /^Hi Alexandra,/);
    assert.doesNotMatch(follow.text, /tracking|opened the link|looked at/i, "a follow-up never says we can see what they did");
  }
});

test("IR emails: the four types read differently, and a name or organisation cannot inject markup", () => {
  const texts = KINDS.map((k) => buildIrEmail({ name: "Sam Patel", org: "", kind: k, link: LINK }).text);
  assert.equal(new Set(texts).size, 4);
  assert.match(buildIrEmail({ name: "", org: "", kind: "contact", link: LINK }).text, /^Hello,/, "no name still reads well");
  const nasty = buildIrEmail({ name: "Sam <script>x</script>", org: "A&B <b>Ltd</b>", kind: "company", link: LINK });
  assert.ok(!nasty.html.includes("<script>") && !nasty.html.includes("<b>Ltd"));
  assert.match(nasty.html, /A&amp;B &lt;b&gt;Ltd&lt;\/b&gt;/);
  assert.match(buildIrEmail({ name: "Sam Patel", org: "Example plc", kind: "company", link: LINK }).subject, /Example plc's shareholders/);
});
