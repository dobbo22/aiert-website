import { test } from "node:test";
import assert from "node:assert/strict";
import { businessDomain, emailOnDomain, isFreeMailDomain } from "../lib/tapcardDomain";

// The rules behind "is this business's own domain": they decide who can verify a card and whether a company's cards count as verified.

test("a business website gives its registered domain", () => {
  assert.equal(businessDomain("https://www.example-cafe.com/menu"), "example-cafe.com");
  assert.equal(businessDomain("example-cafe.co.uk"), "example-cafe.co.uk");
  assert.equal(businessDomain("http://shop.example-cafe.co.uk"), "example-cafe.co.uk");
});

test("social pages, free mail and website builders are not a business's own domain", () => {
  for (const w of ["https://www.facebook.com/mycafe", "instagram.com/mycafe", "https://mycafe.wixsite.com", "gmail.com", "https://linktr.ee/mycafe", "https://mycafe.business.site", "https://www.ubereats.com/store/x"]) {
    assert.equal(businessDomain(w), "", w);
  }
});

test("missing or broken websites give no domain", () => {
  assert.equal(businessDomain(""), "");
  assert.equal(businessDomain("   "), "");
  assert.equal(businessDomain("localhost"), "");
});

test("free-mail domains are recognised, company domains are not", () => {
  assert.equal(isFreeMailDomain("gmail.com"), true);
  assert.equal(isFreeMailDomain("Outlook.com"), true);
  assert.equal(isFreeMailDomain("btinternet.com"), true);
  assert.equal(isFreeMailDomain("example-cafe.com"), false);
  assert.equal(isFreeMailDomain("mail.example-cafe.co.uk"), false);
});

test("an email is on a domain only when it really is (no look-alike endings)", () => {
  assert.equal(emailOnDomain("sam@example-cafe.com", "example-cafe.com"), true);
  assert.equal(emailOnDomain("sam@mail.example-cafe.com", "example-cafe.com"), true);
  assert.equal(emailOnDomain("sam@EXAMPLE-CAFE.com", "example-cafe.com"), true);
  assert.equal(emailOnDomain("sam@notexample-cafe.com", "example-cafe.com"), false);
  assert.equal(emailOnDomain("sam@example-cafe.com.evil.io", "example-cafe.com"), false);
  assert.equal(emailOnDomain("sam@gmail.com", "example-cafe.com"), false);
  assert.equal(emailOnDomain("no-at-sign", "example-cafe.com"), false);
  assert.equal(emailOnDomain("sam@example-cafe.com", ""), false);
});
