"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: number;
  email: string;
  label: string | null;
  createdAt: string;
  signedUp: boolean;
};

export default function ReviewerRow({ id, email, label, createdAt, signedUp }: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!confirm(`Remove ${email} from the reviewer allowlist?`)) return;
    setRemoving(true);
    await fetch("/api/admin/mailbroom/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <tr>
      <td>{email}</td>
      <td>{label || "—"}</td>
      <td>{new Date(createdAt).toLocaleDateString("en-GB")}</td>
      <td className="admin-signed-up-cell">
        {signedUp ? "✅" : "—"}
      </td>
      <td>
        <button type="button" className="admin-invite-btn" onClick={handleRemove} disabled={removing}>
          {removing ? "Removing…" : "Remove"}
        </button>
      </td>
    </tr>
  );
}
