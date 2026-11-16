import { test } from "node:test";
import assert from "node:assert/strict";
import { logoImages } from "../lib/siteIcon";

test("a background picture with 'logo' in its file name is not taken as the logo (spangel.co.uk)", () => {
  const html = `<img decoding="async" class="bg-image" src="https://x.co.uk/uploads/edited-logo-video-3000x2160.jpg" alt="">
    <img class="logo" src="https://x.co.uk/theme/logo-vector.svg" alt="">`;
  assert.deepEqual(logoImages(html), ["https://x.co.uk/theme/logo-vector.svg"]);
});

test("a huge file-name size, or hero/banner words, mark a backdrop", () => {
  assert.deepEqual(logoImages(`<img src="/a/company-logo-4000x3000.jpg">`), []);
  assert.deepEqual(logoImages(`<img src="/a/hero-logo.png">`), []);
  assert.deepEqual(logoImages(`<img class="hero logo" src="/a/x.png">`), []);
});

test("ordinary logos are still found, including sized file names", () => {
  assert.deepEqual(logoImages(`<img class="site-logo" src="/img/logo.png">`), ["/img/logo.png"]);
  assert.deepEqual(logoImages(`<img alt="Acme logo" src="/up/acme-logo-300x90.png">`), ["/up/acme-logo-300x90.png"]);
});
