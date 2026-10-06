"use client";

import { useState } from "react";

export default function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/tapcard/biz/billing-portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className="btn-gold mt-6 rounded-xl px-6 py-3 font-semibold">
      {loading ? "Opening…" : "Manage billing"}
    </button>
  );
}
