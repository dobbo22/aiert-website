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

import { readFileSync } from "node:fs";
import { inlineLogoSvgs, isSafeSvg, svgToPng } from "../lib/siteIcon";

const SP = '<header><a href="/" aria-label="Site Logo" class="masthead__logo">\n<?xml version="1.0" encoding="UTF-8"?> <svg class="" xmlns="http://www.w3.org/2000/svg" width="71" height="64" viewBox="0 0 71 64"><rect width="60" height="60" rx="7" fill="#0d5d4b"/><circle cx="40" cy="40" r="10" fill="#fff"/></svg></a></header><p>x</p>';

test("an inline header SVG is found and drawn to a PNG", async () => {
  const found = inlineLogoSvgs(SP);
  assert.equal(found.length, 1);
  const png = await svgToPng(found[0]);
  assert.ok(png);
  assert.equal(png.contentType, "image/png");
  assert.equal(png.bytes.subarray(1, 4).toString(), "PNG");
});

test("unsafe SVGs are refused", async () => {
  for (const bad of [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/a.svg#x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://evil.example/p)"/></svg>',
    '<!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg"></svg>',
  ]) {
    assert.equal(isSafeSvg(bad), false, bad);
    assert.equal(await svgToPng(bad), null);
  }
  assert.equal(isSafeSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><use href="#g"/></svg>'), true);
});
