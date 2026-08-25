import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL);

const seats = await sql`
  SELECT seat_id, side, invitee_code, guest_label, seat_number
  FROM anniversary_seats
  ORDER BY
    CASE side WHEN 'top' THEN 0 WHEN 'left' THEN 1 WHEN 'right' THEN 2 END,
    seat_id
`;

const invitees = await sql`
  SELECT code, name, menu_choices
  FROM anniversary_invitees
  WHERE rsvp_status = 'accepted'
`;

function entryFor(code, label) {
  const inv = invitees.find((i) => i.code === code);
  const firstName = label.split(/\s+/)[0].toLowerCase();
  return inv?.menu_choices?.find((m) => m.name.toLowerCase() === firstName) ?? null;
}

const rows = seats
  .filter((s) => s.guest_label)
  .map((s) => {
    const entry = entryFor(s.invitee_code, s.guest_label);
    return {
      seat: s.seat_number ?? s.seat_id,
      side: s.side,
      guest: s.guest_label,
      choice: entry?.choice || "",
      notes: (entry?.notes || "").trim(),
    };
  });

const choiceCounts = rows.reduce(
  (acc, r) => {
    if (r.choice === "meat") acc.meat++;
    else if (r.choice === "fish") acc.fish++;
    else if (r.choice === "vegetarian") acc.veg++;
    else acc.none++;
    return acc;
  },
  { meat: 0, fish: 0, veg: 0, none: 0 }
);

const sideLabel = { top: "Top Table", left: "Left Side", right: "Right Side" };

function choiceLabel(c) {
  if (c === "meat") return "Meat";
  if (c === "fish") return "Fish";
  if (c === "vegetarian") return "Vegetarian";
  return "—";
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function seatDisc(r) {
  const cls = r.choice || "none";
  const allergenBadge = r.notes ? `<span class="badge">!</span>` : "";
  const numberBadge = `<span class="seat-num-badge">${r.seat}</span>`;
  return `
    <div class="seat">
      <div class="disc disc-${cls}">${numberBadge}${initials(r.guest)}${allergenBadge}</div>
      <div class="seat-name">${r.guest}</div>
      <div class="seat-choice choice-${cls}">${choiceLabel(r.choice)}</div>
    </div>`;
}

const topSeats = rows.filter((r) => r.side === "top");
const leftSeats = rows.filter((r) => r.side === "left");
const rightSeats = rows.filter((r) => r.side === "right");

const allergenRows = rows
  .filter((r) => r.notes)
  .sort((a, b) => a.guest.localeCompare(b.guest))
  .map(
    (r) => `
    <tr class="allergen-row">
      <td><strong>${r.guest}</strong></td>
      <td><span class="pill pill-${r.choice || "none"}">${choiceLabel(r.choice)}</span></td>
      <td class="note-text">${r.notes}</td>
    </tr>`
  )
  .join("");

const fullListRows = [...rows]
  .sort((a, b) => a.seat - b.seat)
  .map(
    (r) => `
    <tr>
      <td class="num">${r.seat}</td>
      <td>${sideLabel[r.side]}</td>
      <td>${r.guest}</td>
      <td><span class="pill pill-${r.choice || "none"}">${choiceLabel(r.choice)}</span></td>
      <td>${r.notes || "—"}</td>
    </tr>`
  )
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Dobson 25th Anniversary — Table Plan &amp; Dietary Requirements</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }

  :root {
    --paper: #f7f4ec;
    --paper-alt: #eeeadf;
    --panel: #ffffff;
    --ink: #201c16;
    --muted: #6e655a;
    --hairline: #ddd5c3;
    --silver: #8c919a;
    --silver-deep: #4c525c;
    --meat: #a6453d;
    --fish: #35618a;
    --veg: #3e7350;
    --none: #8c8577;
    --allergen: #a5680f;
    --allergen-bg: #fbf0dc;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }

  .page {
    max-width: 760px;
    margin: 0 auto;
    padding: 8mm 0 16mm;
  }

  .masthead {
    text-align: center;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--hairline);
    margin-bottom: 22px;
  }

  .masthead .eyebrow {
    font-size: 10.5px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--silver-deep);
    margin: 0 0 10px;
    font-weight: 600;
  }

  .masthead h1 {
    font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
    font-weight: 400;
    font-size: 32px;
    margin: 0 0 6px;
    color: var(--ink);
    text-wrap: balance;
  }

  .masthead .sub {
    font-family: Georgia, "Iowan Old Style", serif;
    font-style: italic;
    font-size: 15px;
    color: var(--muted);
    margin: 0 0 14px;
  }

  .facts {
    display: flex;
    justify-content: center;
    gap: 28px;
    font-size: 12px;
    color: var(--ink);
  }

  .facts .fact-label {
    display: block;
    font-size: 9.5px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--silver-deep);
    margin-bottom: 2px;
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 0;
    margin: 0 0 26px;
    border: 1px solid var(--hairline);
    border-radius: 3px;
    overflow: hidden;
    background: var(--panel);
  }

  .stat {
    flex: 1;
    text-align: center;
    padding: 10px 6px;
    border-right: 1px solid var(--hairline);
  }

  .stat:last-child { border-right: none; }

  .stat .n {
    display: block;
    font-family: Georgia, serif;
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }

  .stat .lbl {
    font-size: 9.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .stat.meat .n { color: var(--meat); }
  .stat.fish .n { color: var(--fish); }
  .stat.veg .n { color: var(--veg); }
  .stat.total .n { color: var(--ink); }

  h2.section {
    font-family: Georgia, serif;
    font-weight: 400;
    font-size: 17px;
    margin: 30px 0 4px;
    color: var(--ink);
  }

  p.section-note {
    margin: 0 0 14px;
    font-size: 11.5px;
    color: var(--muted);
  }

  .legend {
    display: flex;
    gap: 16px;
    font-size: 10.5px;
    color: var(--muted);
    margin-bottom: 14px;
    flex-wrap: wrap;
  }

  .legend .key { display: inline-flex; align-items: center; gap: 5px; }

  .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
  .dot.meat { background: var(--meat); }
  .dot.fish { background: var(--fish); }
  .dot.veg { background: var(--veg); }
  .dot.none { background: var(--none); }

  .badge-key {
    width: 13px; height: 13px; border-radius: 50%;
    background: var(--allergen); color: #fff;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 800;
  }

  .table-diagram {
    background: var(--panel);
    border: 1px solid var(--hairline);
    border-radius: 4px;
    padding: 22px 16px 18px;
    margin-bottom: 8px;
  }

  .row-label {
    font-size: 9.5px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--silver-deep);
    text-align: center;
    margin-bottom: 8px;
  }

  .top-row {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px dashed var(--hairline);
  }

  .sides {
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }

  .side-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .side-col.right { align-items: flex-end; }
  .side-col.right .seat { text-align: right; }

  .seat {
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    break-inside: avoid;
  }

  .side-col .seat { width: 100%; flex-direction: row; align-items: center; gap: 6px; justify-content: flex-start; }
  .side-col.right .seat { flex-direction: row-reverse; justify-content: flex-start; }

  .disc {
    position: relative;
    width: 28px;
    height: 28px;
    min-width: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.2px;
  }

  .disc-meat { background: var(--meat); }
  .disc-fish { background: var(--fish); }
  .disc-vegetarian { background: var(--veg); }
  .disc-none { background: var(--none); }

  .badge {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--allergen);
    color: #fff;
    font-size: 7.5px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid var(--panel);
  }

  .seat-num-badge {
    position: absolute;
    top: -3px;
    left: -3px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--silver-deep);
    color: #fff;
    font-size: 7px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid var(--panel);
  }

  .seat-name {
    font-size: 9px;
    text-align: center;
    margin-top: 3px;
    max-width: 72px;
    color: var(--ink);
  }

  .side-col .seat-name { text-align: left; margin-top: 0; max-width: none; flex: none; }
  .side-col.right .seat-name { text-align: right; }

  .seat-choice {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-top: 1px;
  }

  .side-col .seat-choice { margin-top: 0; }

  .choice-meat { color: var(--meat); }
  .choice-fish { color: var(--fish); }
  .choice-vegetarian { color: var(--veg); }
  .choice-none { color: var(--none); }

  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--panel);
    border: 1px solid var(--hairline);
    border-radius: 4px;
    overflow: hidden;
    font-size: 11.5px;
  }

  table.doc-table th {
    text-align: left;
    font-size: 9.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--silver-deep);
    background: var(--paper-alt);
    padding: 8px 10px;
    border-bottom: 1px solid var(--hairline);
  }

  table.doc-table td {
    padding: 7px 10px;
    border-bottom: 1px solid var(--hairline);
    vertical-align: top;
  }

  table.doc-table tr:last-child td { border-bottom: none; }

  td.num { font-variant-numeric: tabular-nums; color: var(--muted); }

  tr.allergen-row td { background: var(--allergen-bg); }

  .note-text { font-weight: 700; color: var(--allergen); }

  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    color: #fff;
  }

  .pill-meat { background: var(--meat); }
  .pill-fish { background: var(--fish); }
  .pill-vegetarian { background: var(--veg); }
  .pill-none { background: var(--none); }

  .footer {
    margin-top: 32px;
    padding-top: 14px;
    border-top: 1px solid var(--hairline);
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
  }

  @media print {
    .page { padding: 0; }
    h2.section { break-after: avoid; }
    table.doc-table { break-inside: auto; }
    tr { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="masthead">
    <p class="eyebrow">25th Wedding Anniversary</p>
    <h1>Martin &amp; Karen Dobson</h1>
    <p class="sub">Table Plan &amp; Dietary Requirements — for the venue</p>
    <div class="facts">
      <div><span class="fact-label">Date</span>Sunday, 30 August 2026</div>
      <div><span class="fact-label">Time</span>6:00pm</div>
      <div><span class="fact-label">Venue</span>River Room, One Whitehall Place, London SW1A 2EJ</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat total"><span class="n">${rows.length}</span><span class="lbl">Guests</span></div>
    <div class="stat meat"><span class="n">${choiceCounts.meat}</span><span class="lbl">Meat</span></div>
    <div class="stat fish"><span class="n">${choiceCounts.fish}</span><span class="lbl">Fish</span></div>
    <div class="stat veg"><span class="n">${choiceCounts.veg}</span><span class="lbl">Vegetarian</span></div>
  </div>

  <h2 class="section">Table Plan</h2>
  <p class="section-note">Single top table with two facing side runs, seated as one open square.</p>
  <div class="legend">
    <span class="key"><span class="dot meat"></span> Meat</span>
    <span class="key"><span class="dot fish"></span> Fish</span>
    <span class="key"><span class="dot veg"></span> Vegetarian</span>
    <span class="key"><span class="badge-key">!</span> Allergen — see table below</span>
  </div>

  <div class="table-diagram">
    <div class="row-label">Top Table</div>
    <div class="top-row">
      ${topSeats.map(seatDisc).join("")}
    </div>
    <div class="sides">
      <div class="side-col left">
        ${leftSeats.map(seatDisc).join("")}
      </div>
      <div class="side-col right">
        ${rightSeats.map(seatDisc).join("")}
      </div>
    </div>
  </div>

  <h2 class="section">Allergens &amp; Dietary Notes</h2>
  <p class="section-note">Please flag these to kitchen staff — every other guest has no recorded restriction.</p>
  <table class="doc-table">
    <thead>
      <tr><th>Guest</th><th>Menu</th><th>Note</th></tr>
    </thead>
    <tbody>
      ${allergenRows}
    </tbody>
  </table>

  <h2 class="section">Full Guest &amp; Menu List</h2>
  <p class="section-note">Sorted by seat number.</p>
  <table class="doc-table">
    <thead>
      <tr><th>Seat</th><th>Position</th><th>Guest</th><th>Menu</th><th>Note</th></tr>
    </thead>
    <tbody>
      ${fullListRows}
    </tbody>
  </table>

  <div class="footer">
    <span>Prepared for River Room, One Whitehall Place</span>
    <span>${rows.length} confirmed guests · generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
  </div>

</div>
</body>
</html>`;

const outPath = "/private/tmp/claude-502/-Users-martin-Desktop/d5fa5ab8-cb7c-4fad-97eb-f8fddcd90f8a/scratchpad/table-plan-venue.html";
fs.writeFileSync(outPath, html);
console.log("Written:", outPath, "rows:", rows.length);
