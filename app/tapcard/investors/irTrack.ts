// A personal link (/investors?v=<code>) tells us whether that person opened the page and really looked. No cookie, no IP address kept.
export function irToken(): string | null {
  try {
    const v = new URLSearchParams(window.location.search).get("v");
    return v && /^[a-z0-9]{8,16}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function irTrack(kind: "visit" | "engaged" | "tab" | "video" | "video-end", detail = ""): void {
  const v = irToken();
  if (!v) return;
  const body = JSON.stringify({ v, kind, detail });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/ir-visit", new Blob([body], { type: "application/json" }));
    else void fetch("/api/ir-visit", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch { /* tracking must never get in the reader's way */ }
}
