"use client";

export default function AdviserLogout() {
  return (
    <button type="button" onClick={async () => { await fetch("/api/tapcard/adviser/logout", { method: "POST" }); window.location.href = "/business/adviser"; }}
      className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate hover:ring-mist">Sign out</button>
  );
}
