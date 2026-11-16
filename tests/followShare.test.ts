import test from "node:test";
import assert from "node:assert/strict";
import { validateShare } from "../lib/tapcardShareRules";

test("good details are tidied and accepted", () => {
  const r = validateShare({ name: "  Pat   Smith ", email: " Pat@Example.COM ", phone: "" });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.details, { name: "Pat Smith", email: "pat@example.com", phone: "" });
});
test("a phone number is never taken, even if an older app sends one", () => {
  const r = validateShare({ name: "Pat Smith", email: "p@x.com", phone: "+44 7700 900123" });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.details.phone, "");
  assert.ok(validateShare({ name: "Pat Smith", email: "p@x.com", phone: "12" }).ok, "a bad phone number no longer blocks the follow");
});
test("missing or bad name and email are refused", () => {
  assert.equal(validateShare(null).ok, false);
  assert.equal(validateShare({ name: "P", email: "p@x.com" }).ok, false);
  assert.equal(validateShare({ name: "Pat Smith", email: "not-an-email" }).ok, false);
  assert.equal(validateShare({ name: "Pat Smith", email: "p@x" }).ok, false);
  assert.equal(validateShare({ name: "x".repeat(130), email: "p@x.com" }).ok, false);
});

import { formatEventList } from "../lib/tapcardShareRules";
test("every event a follower came through is listed, oldest first, windows marked", () => {
  assert.equal(formatEventList([]), "");
  assert.equal(formatEventList([{ label: "AGM 2026", via: "code" }]), "AGM 2026");
  assert.equal(formatEventList([{ label: "AGM 2026", via: "code" }, { label: "Roadshow", via: "window" }]), "AGM 2026, Roadshow (event window)");
});

import { pickSlot, cleanScanTime } from "../lib/tapcardShareRules";
const slots = [
  { id: 1, startsAt: "2026-11-20T09:30:00Z", endsAt: "2026-11-20T10:30:00Z" },
  { id: 2, startsAt: "2026-11-20T11:00:00Z", endsAt: "2026-11-20T12:00:00Z" },
  { id: 3, startsAt: "2026-11-20T11:30:00Z", endsAt: "2026-11-20T11:45:00Z" },
];
test("a scan lands in the slot its time falls in; between slots is none", () => {
  assert.equal(pickSlot(slots, new Date("2026-11-20T09:30:00Z"))?.id, 1, "start is inclusive");
  assert.equal(pickSlot(slots, new Date("2026-11-20T10:30:00Z")), null, "end is exclusive");
  assert.equal(pickSlot(slots, new Date("2026-11-20T10:45:00Z")), null);
  assert.equal(pickSlot(slots, new Date("2026-11-20T11:10:00Z"))?.id, 2);
  assert.equal(pickSlot(slots, new Date("2026-11-20T11:35:00Z"))?.id, 3, "overlap: the latest start wins");
  assert.equal(pickSlot([], new Date()), null);
});
test("a reported scan time must be real, recent and not in the future", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  assert.equal(cleanScanTime("2026-11-20T09:31:00Z", now)?.toISOString(), "2026-11-20T09:31:00.000Z");
  assert.equal(cleanScanTime(now.getTime() - 3600_000, now)?.getTime(), now.getTime() - 3600_000);
  assert.equal(cleanScanTime("2026-11-21T12:00:00Z", now), null, "future");
  assert.equal(cleanScanTime("2026-08-01T12:00:00Z", now), null, "over 60 days old");
  assert.equal(cleanScanTime("nonsense", now), null);
  assert.equal(cleanScanTime(undefined, now), null);
});

import { cleanPrivacyUrl } from "../lib/tapcardShareRules";
test("a company privacy link must be a plain https address", () => {
  assert.equal(cleanPrivacyUrl("https://www.kefi.com/privacy"), "https://www.kefi.com/privacy");
  assert.equal(cleanPrivacyUrl("  https://kefi.com/privacy-policy  "), "https://kefi.com/privacy-policy");
  assert.equal(cleanPrivacyUrl("http://kefi.com/privacy"), "", "http refused");
  assert.equal(cleanPrivacyUrl("javascript:alert(1)"), "");
  assert.equal(cleanPrivacyUrl("https://has space.com/x"), "");
  assert.equal(cleanPrivacyUrl("https://localhost/x"), "", "needs a real domain");
  assert.equal(cleanPrivacyUrl(42), "");
});

import { emailGroup } from "../lib/tapcardShareRules";
test("personal mail addresses are private investors, company addresses group by domain", () => {
  for (const e of ["a@gmail.com", "a@GoogleMail.com", "a@hotmail.com", "a@hotmail.co.uk", "a@outlook.com", "a@outlook.fr", "a@live.co.uk", "a@yahoo.co.uk", "a@icloud.com", "a@btinternet.com", "a@btopenworld.com", "a@sky.com", "a@protonmail.com", "a@aol.com", "nonsense", ""])
    assert.deepEqual(emailGroup(e), { kind: "private" }, e);
  assert.deepEqual(emailGroup("jo@acme.co.uk"), { kind: "company", domain: "acme.co.uk" });
  assert.deepEqual(emailGroup("jo@mail.acme.co.uk"), { kind: "company", domain: "acme.co.uk" });
  assert.deepEqual(emailGroup("jo@www.acme.com"), { kind: "company", domain: "acme.com" });
  assert.deepEqual(emailGroup("Jo@Hobart-Capital.com"), { kind: "company", domain: "hobart-capital.com" });
  assert.deepEqual(emailGroup("jo@mailchimp.com"), { kind: "company", domain: "mailchimp.com" });
});
