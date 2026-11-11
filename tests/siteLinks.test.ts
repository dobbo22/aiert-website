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

test("hours above the address, with the listing's postcode one letter off the site's, still give the whole week", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><p>Event Pack</p><h3>OPENING HOURS</h3>
    <p>Monday - Friday 12:00 - 23:00</p><p>Saturday</p><p>09:00 - 23:00</p><p>Sunday</p><p>09:00 - 22:30</p>
    <p>Where to find us:</p><p>60 Blomfield Road, London W9 2PA</p><p>Part of First Restaurant Group</p></body></html>`;
  const r = await findSiteLinks("https://summer.example", "60 Blomfield Road, Warwick Avenue, London, W9 2PB", "The Summerhouse", { html, url: "https://summer.example/" });
  const hours = r.links.find((l) => l.kind === "hours")?.value ?? "";
  assert.match(hours, /^Mon.Fri 12:00.23:00; Sat 09:00.23:00; Sun 09:00.22:30$/);
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

test("a club on the MatchPoint system gets its booking, matches, activities, membership and prices rows", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><nav><ul><li><a href='/Booking/Grid.aspx'>Bookings</a></li>
<li><a href='/Matches/Search.aspx'>Open matches</a></li><li><a href='/ActBooking/WeekGrid.aspx'>Activities</a></li>
<li><a href='/Pages/14-brentwood_padel_club__rates'>Court Prices</a></li><li><a href='/memberships/subscribe.aspx'>Subscribe</a></li>
<li><a href='/Pages/41-code_of_conduct'>Code of conduct</a></li></ul></nav>
<a href="https://apps.apple.com/us/app/brentwood-padel-club/id1642489509">APP STORE</a>
<a href="https://tpcmatchpoint.com/en">Sports Centers Management Software</a></body></html>`;
  const r = await findSiteLinks("https://club.example", "Childerditch Lane, Brentwood CM13 3FD", "Brentwood Padel Club", { html, url: "https://club.example/" });
  const by = (l: string) => r.links.find((x) => x.label === l)?.value;
  assert.equal(by("Book a court"), "https://club.example/Booking/Grid.aspx");
  assert.equal(by("Open matches"), "https://club.example/Matches/Search.aspx");
  assert.equal(by("Activities and coaching"), "https://club.example/ActBooking/WeekGrid.aspx");
  assert.equal(by("Court prices"), "https://club.example/Pages/14-brentwood_padel_club__rates");
  assert.equal(by("Membership"), "https://club.example/memberships/subscribe.aspx");
  assert.equal(by("Get the club app"), "https://apps.apple.com/us/app/brentwood-padel-club/id1642489509");
  assert.ok(!r.links.some((x) => /conduct/i.test(x.value)), "policy pages are not offered");
});

test("a site that is not on MatchPoint is unaffected", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><a href='/Booking/Grid.aspx'>Bookings</a></body></html>`;
  const r = await findSiteLinks("https://other.example", "", "Other", { html, url: "https://other.example/" });
  assert.ok(!r.links.some((x) => x.label === "Book a court"));
});

test("a venue's own page: its Playtomic link, its own email and the membership page are taken, not another venue's", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><a href="https://playtomic.io/club-earls-court/abc">Book a court</a>
<a href="/pages/membership">Membership</a><p><a href="mailto:events@club.example">events@club.example</a></p>
<p><a href="mailto:paddington@club.example">paddington@club.example</a></p>
<a href="https://playtomic.com/clubs/club-paddington">Book a court</a></body></html>`;
  const r = await findSiteLinks("https://club.example/pages/paddington", "5 Kingdom Street, London W2 6BD", "Padel Social Club", { html, url: "https://club.example/pages/paddington" });
  assert.equal(r.links.find((l) => l.label === "Book a court")?.value, "https://playtomic.com/clubs/club-paddington");
  assert.equal(r.links.find((l) => l.label === "Membership")?.value, "https://club.example/pages/membership");
  assert.equal(r.details.email, "paddington@club.example");
});

test("two court-booking links that cannot be told apart give none, one gives it", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const two = `<html><body><a href="https://playtomic.com/clubs/a">Book</a><a href="https://playtomic.com/clubs/b">Book</a></body></html>`;
  const r2 = await findSiteLinks("https://x.example", "", "X", { html: two, url: "https://x.example/" });
  assert.ok(!r2.links.some((l) => l.label === "Book a court"));
  const one = `<html><body><a href="https://playtomic.com/clubs/only">Book</a></body></html>`;
  const r1 = await findSiteLinks("https://x.example", "", "X", { html: one, url: "https://x.example/" });
  assert.equal(r1.links.find((l) => l.label === "Book a court")?.value, "https://playtomic.com/clubs/only");
});

test("an address that runs two venues together is not offered", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><p>Earls Court, Empress Place, SW6 1TT</p><p>Paddington, 5 Kingdom Street, London, W2 6BD</p></body></html>`;
  const r = await findSiteLinks("https://g.example/pages/paddington", "5 Kingdom Street, London W2 6BD", "G", { html, url: "https://g.example/pages/paddington" });
  assert.ok(!r.details.address || new Set((r.details.address.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/gi) ?? []).map((x) => x.replace(/\s/g, ""))).size <= 1);
});

test("a gym's trial button gives a Book a free trial row, but its package buttons and vague calls to action do not", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><a href="/contact">Book Your Trial</a> <a href="/contact">Start Journey Today!</a> <a href="/services">Book Here</a>
    <a href="https://buy.stripe.com/abc">Purchase Here</a></body></html>`;
  const r = await findSiteLinks("https://gym.example", "1 High St, London W1A 1AA", "Gym", { html, url: "https://gym.example/" });
  assert.ok(r.links.some((l) => l.label === "Book a free trial" && l.value === "https://gym.example/contact"), "trial link found");
  assert.equal(r.links.filter((l) => /book/i.test(l.label)).length, 1, "nothing else is offered as a booking");
  assert.ok(!r.links.some((l) => /stripe/.test(l.value)), "a payment link is not offered");
});

test("a gym on Glofox gives its trial class, and ignores Join us and Buy credits", async () => {
  const { findSiteLinks } = await import("../lib/siteLinks");
  const html = `<html><body><a href="https://app.glofox.com/portal/#/branch/aaa/memberships?header=members">Join Us</a>
    <a href="https://app.glofox.com/portal/#/branch/bbb/memberships/trial1">PURCHASE TRIAL CLASS</a>
    <a href="https://app.glofox.com/portal/#/branch/bbb/memberships/cred1">BUY CREDITS</a></body></html>`;
  const r = await findSiteLinks("https://gym.example", "1 High St, London W1A 1AA", "Gym", { html, url: "https://gym.example/" });
  assert.ok(r.links.some((l) => l.label === "Book a trial class" && l.value.includes("trial1")), "trial class found");
  assert.ok(!r.links.some((l) => l.value.includes("branch/aaa") || l.value.includes("cred1")), "membership and credits links are left out");
});
