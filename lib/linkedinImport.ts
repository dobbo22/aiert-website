// Reads LinkedIn's Connections.csv (LinkedIn → Settings → Data privacy →
// Get a copy of your data → Connections) for the TapCard Invites import.
// Runs in the browser like the vCard import. Emails are only included for
// connections who allow it, so most rows are name + profile URL.

import { normaliseLinkedinUrl } from "@/lib/inviteTemplates";
import type { ImportedContact } from "@/lib/vcardImport";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

export function parseLinkedinConnections(text: string): ImportedContact[] {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  // The file starts with a few "Notes:" lines before the real header.
  const headerIndex = rows.findIndex((r) => r.some((c) => c.trim() === "First Name") && r.some((c) => c.trim() === "URL"));
  if (headerIndex === -1) return [];
  const header = rows[headerIndex].map((c) => c.trim());
  const col = (row: string[], name: string) => (row[header.indexOf(name)] ?? "").trim();

  const contacts: ImportedContact[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const first = col(row, "First Name");
    const last = col(row, "Last Name");
    const name = [first, last].filter(Boolean).join(" ");
    const linkedin = normaliseLinkedinUrl(col(row, "URL"));
    if (!name || !linkedin) continue;
    contacts.push({ name, firstName: first, email: col(row, "Email Address"), phone: "", company: col(row, "Company"), linkedin });
  }
  return contacts;
}
