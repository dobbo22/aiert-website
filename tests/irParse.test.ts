import test from "node:test";
import assert from "node:assert/strict";
import { findDate, headlineOf, parseAnnouncements } from "../lib/tapcardIrParse";

const TABLE = `<nav><ul><li><a href="/news">Announcements</a></li><li><a href="/2025">2025</a></li></ul></nav>
<table><tbody>
<tr class="odd"><td>27-Oct-2026</td><td><a href="https://www.example.com/files/jq.pdf" target="_blank">Conditional Approval of Development at Jibal Qutman</a></td><td>pdf</td><td>926 KB</td></tr>
<tr class="even"><td>12-Oct-2026</td><td><a href="/files/tulu.pdf">Recommencement of Development at Tulu Kapi Gold Project</a></td><td>pdf</td><td>94 KB</td></tr>
<tr><td>29-Sep-2026</td><td><a href="/files/interim.pdf">Interim Results for the Six Months Ended 30 June 2026</a></td></tr>
</tbody></table>`;

test("dates are read in the usual layouts", () => {
  assert.equal(findDate("27-Oct-2026"), "2026-10-27");
  assert.equal(findDate("Posted 3 November 2026 at 7am"), "2026-11-03");
  assert.equal(findDate("2026-11-13T09:30:00Z"), "2026-11-13");
  assert.equal(findDate("13/11/2026"), "2026-11-13");
  assert.equal(findDate("no date here"), null);
});
test("a table of dated announcements is read newest first, links made absolute and https", () => {
  const items = parseAnnouncements(TABLE, "https://www.example.com/news/announcements");
  assert.deepEqual(items.map((i) => i.date), ["2026-10-27", "2026-10-12", "2026-09-29"]);
  assert.equal(items[0].title, "Conditional Approval of Development at Jibal Qutman");
  assert.equal(items[1].url, "https://www.example.com/files/tulu.pdf");
});
test("menus and year links without a date are ignored", () => {
  const items = parseAnnouncements(TABLE, "https://www.example.com/news/announcements");
  assert.ok(!items.some((i) => /^(Announcements|2025)$/.test(i.title)));
});
test("an RSS feed is read too", () => {
  const rss = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Trading Update]]></title><link>https://www.example.com/rns/1</link><pubDate>Fri, 13 Nov 2026 07:00:00 GMT</pubDate></item></channel></rss>`;
  const items = parseAnnouncements(rss, "https://www.example.com/feed");
  assert.deepEqual(items, [{ title: "Trading Update", url: "https://www.example.com/rns/1", date: "2026-11-13" }]);
});
test("scripts, bad pages and long titles are handled", () => {
  assert.deepEqual(parseAnnouncements("<script>var a=1</script>", "https://x.com"), []);
  assert.deepEqual(parseAnnouncements(TABLE, "not a url"), []);
  assert.ok(headlineOf("x".repeat(300)).length <= 140);
});
