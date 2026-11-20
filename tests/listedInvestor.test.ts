import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLink, detectFigures, extractAnchors, pickLinks } from "../lib/listedInvestorParse";

const html = `<nav><a href="/about">About</a> <a href="/investors">Investors</a> <a href="/investors/rns">RNS</a> <a href="/investors/reports-and-results">Reports and results</a>
 <a href="/investors/share-price">Share price</a> <a href="https://twitter.com/x">X</a> <a href="mailto:a@b.c">mail</a> <a href="/doc.pdf">Annual report</a></nav>`;

test("anchors are resolved and social links, mail links and fragments are dropped", () => {
  const a = extractAnchors(html, "https://www.example.com/");
  assert.ok(a.some((x) => x.href === "https://www.example.com/investors" && x.text === "Investors"));
  assert.ok(!a.some((x) => /twitter|mailto/.test(x.href)));
});

test("each investor link is classified by what it says and where it goes", () => {
  const picked = Object.fromEntries(pickLinks(extractAnchors(html, "https://www.example.com/")).map((l) => [l.role, l.url]));
  assert.equal(picked.ir, "https://www.example.com/investors");
  assert.equal(picked.rns, "https://www.example.com/investors/rns");
  assert.equal(picked.reports, "https://www.example.com/investors/reports-and-results");
  assert.equal(picked.price, "https://www.example.com/investors/share-price");
  assert.equal(classifyLink("Annual report", "https://www.example.com/doc.pdf"), "");
  assert.equal(classifyLink("Our people", "https://www.example.com/people"), "");
  assert.equal(classifyLink("Regulatory news", "https://www.example.com/news"), "rns");
});

test("a share price or market cap in the page text, or in an embedded widget, is seen", () => {
  assert.deepEqual(detectFigures("<p>Share price: 12.5p</p><p>Market capitalisation £45.2m</p>").price.state, "yes");
  assert.equal(detectFigures("<p>Market capitalisation: £45.2m</p>").cap.state, "yes");
  assert.equal(detectFigures(`<iframe src="https://widgets.euroland.com/x"></iframe>`).price.state, "widget");
  const none = detectFigures("<p>We are a mining company.</p>");
  assert.equal(none.price.state, "no");
  assert.equal(none.cap.state, "no");
});
