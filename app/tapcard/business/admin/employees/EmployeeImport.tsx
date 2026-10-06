"use client";

import { useState } from "react";

// Expects a flat CSV: name,email,title — a format we define ourselves
// (not a third-party export like LinkedIn's Connections.csv, so no need
// for a heavier parser). Parsed client-side, then sent to the import API
// in one batch.
function parseCsv(text: string): { name: string; email: string; title: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows = lines.map((line) => line.split(",").map((c) => c.trim()));
  // Skip a header row if the first cell looks like a column name, not an email.
  const start = rows[0]?.[1]?.includes("@") ? 0 : 1;
  return rows.slice(start).map(([name, email, title]) => ({ name: name ?? "", email: email ?? "", title: title ?? "" }));
}

export default function EmployeeImport({ billingActive }: { billingActive: boolean }) {
  const [rows, setRows] = useState<{ name: string; email: string; title: string }[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setRows(parseCsv(text));
    setResult(null);
  }

  async function handleImport() {
    setImporting(true);
    const res = await fetch("/api/tapcard/biz/employees/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employees: rows }),
    });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setResult(data.error ?? "Import failed");
      return;
    }
    setResult(`Imported ${data.imported}, invited ${data.invited} new.`);
    setRows([]);
    setFileName(null);
    window.location.reload();
  }

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Add employees</h2>
      <p className="mt-1 text-sm text-mist">
        Upload a CSV with columns: name, email, title. Each new person gets an email with a link to set up their
        card — re-uploading the same file won't duplicate or resend anyone already added.
      </p>

      {!billingActive && (
        <p className="mt-3 rounded-xl bg-slate/40 px-4 py-3 text-gold">
          Billing isn't active yet, so employees can't be added right now.
        </p>
      )}

      <div className="mt-4 flex items-center gap-4">
        <input type="file" accept=".csv,text/csv" onChange={handleFile} disabled={!billingActive} className="text-cloud" />
        {fileName && <span className="text-sm text-mist">{fileName} — {rows.length} rows</span>}
      </div>

      {rows.length > 0 && (
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || !billingActive}
          className="btn-gold mt-4 rounded-xl px-6 py-3 font-semibold"
        >
          {importing ? "Importing…" : `Add ${rows.length} employees`}
        </button>
      )}

      {result && <p className="mt-3 text-teal">{result}</p>}
    </div>
  );
}
