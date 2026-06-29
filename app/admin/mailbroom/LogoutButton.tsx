"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/admin/mailbroom/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <button type="button" className="admin-logout-btn" onClick={handleLogout}>
      Log out
    </button>
  );
}
