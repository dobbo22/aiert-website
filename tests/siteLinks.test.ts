import { test } from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

// A group's homepage: each branch is a section that starts with its own address, and has its own booking or ordering button.
const HTML = `<html><body>
<section><h2>Little Venice</h2><p>14 Formosa St, London, W9 1EE</p>
  <a href="https://www.quandoo.co.uk/en/checkout-widget/widget?aid=146&amp;merchantId=90909">Book Now</a></section>
<section><h2>Kensington</h2><p>1 High St, London, W8 4AA</p>
  <a href="https://www.quandoo.co.uk/en/checkout-widget/widget?aid=146&amp;merchantId=46437">Book Now</a></section>
<section><h2>Hayes</h2><p>Unit 5, Hayes, UB3 4DJ</p>
  <a href="https://deliveroo.co.uk/menu/london/southall/chakra-hayes?utm_campaign=organic&#038;utm_source=menu_share">Order Takeaway Now</a></section>
</body></html>`;

test("an ordering or booking link in another branch's section is not this branch's", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const pre = { html: HTML, url: "https://group.example/" };
  const venice = await findSiteLinks("https://group.example", "14 Formosa St, London W9 1EE", "Group Little Venice", pre);
  assert.ok(!venice.links.some((l) => l.kind === "order"), "Hayes's Deliveroo is not Little Venice's");
  assert.ok(venice.links.find((l) => l.kind === "book_table")?.value.includes("merchantId=90909"), "its own booking link is kept");
  const hayes = await findSiteLinks("https://group.example", "Unit 5, Hayes UB3 4DJ", "Group Hayes", pre);
  const order = hayes.links.find((l) => l.kind === "order");
  assert.ok(order?.value.includes("chakra-hayes"), "Hayes keeps its own order link");
  assert.ok(!order!.value.includes("&#038;") && order!.value.includes("&utm_source=menu_share"), "an escaped ampersand in a link is decoded");
  assert.ok(!hayes.links.some((l) => l.kind === "book_table" && /merchantId=(90909|46437)/.test(l.value)), "other branches' booking links are not Hayes's");
});

test("a single-address site keeps its links whatever the postcode", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><p>2 Mill Lane, Dunmow CM6 1AB</p><a href="https://deliveroo.co.uk/menu/x/y">Order</a></body></html>`;
  const r = await findSiteLinks("https://one.example", "2 Mill Lane, Dunmow CM6 1AB", "One", { html, url: "https://one.example/" });
  assert.ok(r.links.some((l) => l.kind === "order"));
});

test("the site's own delivery page gives this branch's ordering link", async () => {
  const { bestOrderLink } = await import("../lib/siteLinks");
  const cands = [
    { url: "https://deliveroo.co.uk/menu/london/maida-vale/chakra-little-venice", context: "Delivery Little Venice" },
    { url: "https://deliveroo.co.uk/menu/london/holland-park/chakra-holland-street", context: "Kensington" },
  ];
  assert.equal(bestOrderLink(cands, "Chakra Little Venice 14 Formosa St, London W9 1EE"), cands[0].url);
  assert.equal(bestOrderLink(cands, "Chakra Kensington 1 Holland Street London W8"), cands[1].url);
  assert.equal(bestOrderLink(cands, "Somewhere Else 1 Other Rd"), null, "several links and none for this branch: none, not a guess");
  assert.equal(bestOrderLink([cands[0]], "Anything"), cands[0].url, "one link on the page is taken");
  assert.equal(bestOrderLink([], "Anything"), null);
});

test("a week set out one day per line gives every open day, and leaves a closed day out", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><p>14 Formosa St, London W9 1EE</p>
    <div>Monday: Closed</div><div>Tuesday to Thursday: 1pm – 3:30pm, 5pm – 10pm</div>
    <div>Friday and Saturday: 1pm – 3:30pm, 5pm – 10:30pm</div><div>Sunday: 1pm – 3:30pm, 5pm – 10pm</div></body></html>`;
  const r = await findSiteLinks("https://hours.example", "14 Formosa St, London W9 1EE", "Hours Place", { html, url: "https://hours.example/" });
  const hours = r.links.find((l) => l.kind === "hours")?.value ?? "";
  assert.match(hours, /^Tue to Thu: 1pm.3:30pm, 5pm.10pm; Fri and Sat: 1pm.3:30pm, 5pm.10:30pm; Sun: 1pm.3:30pm, 5pm.10pm$/);
  assert.ok(!/mon/i.test(hours), "a closed day is not listed");
});

test("an OPENING HOURS heading with a day on one line and its times on the next gives the whole week", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><p>60 Blomfield Road, London W9 2PB</p><h3>OPENING HOURS</h3>
    <p>Monday - Friday 12:00 - 23:00</p><p>Saturday</p><p>09:00 - 23:00</p><p>Sunday</p><p>09:00 - 22:30</p></body></html>`;
  const r = await findSiteLinks("https://summer.example", "60 Blomfield Road, London W9 2PB", "The Summerhouse", { html, url: "https://summer.example/" });
  const hours = r.links.find((l) => l.kind === "hours")?.value ?? "";
  assert.match(hours, /^Mon.Fri 12:00.23:00; Sat 09:00.23:00; Sun 09:00.22:30$/);
});

test("a site that only lists another area is flagged, a site near the address is not", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const islington = `<html><body><p>Contact Us</p><p>Islington 69 Chapel Market, Angel, London N1 9ER Tel: 020 7713 6555</p></body></html>`;
  const far = await findSiteLinks("https://catch.example", "407A North End Rd, London SW6 1NS", "Ocean Catch London", { html: islington, url: "https://catch.example/" });
  assert.equal(far.otherPlaceOnly, true, "Fulham address, Islington-only site");
  const near = await findSiteLinks("https://catch.example", "69 Chapel Market, London N1 9ER", "Ocean Catch", { html: islington, url: "https://catch.example/" });
  assert.ok(!near.otherPlaceOnly, "the site's own address");
  const none = await findSiteLinks("https://catch.example", "407A North End Rd, London SW6 1NS", "Ocean Catch", { html: "<html><body>Fresh fish</body></html>", url: "https://catch.example/" });
  assert.ok(!none.otherPlaceOnly, "a site that gives no address is not judged");
  const sameArea = await findSiteLinks("https://catch.example", "1 Chapel Market, London N1 9EZ", "Ocean Catch", { html: islington, url: "https://catch.example/" });
  assert.ok(!sameArea.otherPlaceOnly, "same postcode area");
});
