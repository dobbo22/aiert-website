"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/tapcard/biz/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate hover:ring-mist"
    >
      Sign out
    </button>
  );
}
