"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// A "Live" switch: while it is on and the tab is showing, the page refreshes its numbers every 5 seconds (followers, events, insights),
// so a demo moves on screen. Off by default. Opening any admin page with ?live=1 turns it on. Nothing is sent anywhere new.
export default function LiveRefresh() {
  const router = useRouter();
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      const fromLink = new URLSearchParams(window.location.search).get("live") === "1";
      const start = fromLink || window.sessionStorage.getItem("tapcard.admin.live") === "1";
      queueMicrotask(() => setOn(start));
    } catch { /* no storage: stays off */ }
  }, []);

  useEffect(() => {
    try { window.sessionStorage.setItem("tapcard.admin.live", on ? "1" : "0"); } catch { /* ignore */ }
    if (!on) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 5000);
    return () => clearInterval(t);
  }, [on, router]);

  return (
    <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-cloud ring-1 ring-slate hover:ring-mist">
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-4 w-4 accent-current" />
      Live{on ? <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-teal" aria-hidden /> : null}
    </label>
  );
}
