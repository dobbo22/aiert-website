import { cookies } from "next/headers";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/adminAuth";
import LoginForm from "./LoginForm";

export const metadata = { robots: { index: false, follow: false } };

type Row = {
  code: string;
  name: string;
  view_count: number;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  rsvp_status: "accepted" | "declined" | null;
  guest_count: number | null;
  dietary_notes: string | null;
  message: string | null;
  responded_at: string | null;
  guest_email: string | null;
};

export default async function AdminAnniversaryPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  if (!isValidAdminSession(session)) {
    return <LoginForm />;
  }

  const invitees = (await sql`
    SELECT code, name, view_count, first_viewed_at, last_viewed_at,
           rsvp_status, guest_count, dietary_notes, message, responded_at, guest_email
    FROM anniversary_invitees
    ORDER BY name ASC
  `) as Row[];

  const totalGuests = invitees
    .filter((i) => i.rsvp_status === "accepted")
    .reduce((sum, i) => sum + (i.guest_count ?? 0), 0);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Anniversary Invitees</h1>
      <p style={{ marginBottom: "1.5rem", color: "#555" }}>
        {invitees.length} invited · {invitees.filter((i) => i.rsvp_status === "accepted").length} accepted ·{" "}
        {invitees.filter((i) => i.rsvp_status === "declined").length} declined · {totalGuests} guests total
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
            <th style={{ padding: "0.5rem" }}>Name</th>
            <th style={{ padding: "0.5rem" }}>Code</th>
            <th style={{ padding: "0.5rem" }}>Views</th>
            <th style={{ padding: "0.5rem" }}>Last Viewed</th>
            <th style={{ padding: "0.5rem" }}>RSVP</th>
            <th style={{ padding: "0.5rem" }}>Email</th>
            <th style={{ padding: "0.5rem" }}>Guests</th>
            <th style={{ padding: "0.5rem" }}>Dietary</th>
            <th style={{ padding: "0.5rem" }}>Message</th>
          </tr>
        </thead>
        <tbody>
          {invitees.map((i) => (
            <tr key={i.code} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.5rem" }}>{i.name}</td>
              <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{i.code}</td>
              <td style={{ padding: "0.5rem" }}>{i.view_count}</td>
              <td style={{ padding: "0.5rem" }}>
                {i.last_viewed_at ? new Date(i.last_viewed_at).toLocaleString("en-GB") : "—"}
              </td>
              <td style={{ padding: "0.5rem" }}>
                {i.rsvp_status === "accepted" && "✅ Accepted"}
                {i.rsvp_status === "declined" && "❌ Declined"}
                {!i.rsvp_status && "—"}
              </td>
              <td style={{ padding: "0.5rem" }}>{i.guest_email || "—"}</td>
              <td style={{ padding: "0.5rem" }}>{i.guest_count ?? "—"}</td>
              <td style={{ padding: "0.5rem" }}>{i.dietary_notes || "—"}</td>
              <td style={{ padding: "0.5rem" }}>{i.message || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
