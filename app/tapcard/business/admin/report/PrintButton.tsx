"use client";

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn-gold rounded-xl px-5 py-2 font-semibold print:hidden">Print or save as PDF</button>;
}
