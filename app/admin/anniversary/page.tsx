import { cookies } from "next/headers";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/adminAuth";
import LoginForm from "./LoginForm";
import SeatingChart from "./SeatingChart";
import SendInviteButton from "./SendInviteButton";
import SendAllButton from "./SendAllButton";
import { guestCountForName } from "@/lib/guestCount";
import "./admin.css";

export const metadata = {
  title: "Anniversary RSVPs — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type MenuChoice = {
  name: string;
  choice: "" | "meat" | "fish" | "vegetarian";
  notes: string;
};

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
  menu_choices: MenuChoice[] | null;
  invite_sent_at: string | null;
  invite_opened_at: string | null;
  invite_open_count: number;
};

type SeatRow = {
  seat_id: number;
  side: "top" | "left" | "right";
  invitee_code: string | null;
  guest_label: string | null;
};

export default async function AdminAnniversaryPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  if (!isValidAdminSession(session)) {
    return <LoginForm />;
  }

  const invitees = (await sql`
    SELECT code, name, view_count, first_viewed_at, last_viewed_at,
           rsvp_status, guest_count, dietary_notes, message, responded_at, guest_email, menu_choices,
           invite_sent_at, invite_opened_at, invite_open_count
    FROM anniversary_invitees
    ORDER BY name ASC
  `) as Row[];

  const seats = (await sql`
    SELECT seat_id, side, invitee_code, guest_label
    FROM anniversary_seats
    ORDER BY seat_id ASC
  `) as SeatRow[];

  const acceptedCount = invitees.filter((i) => i.rsvp_status === "accepted").length;
  const declinedCount = invitees.filter((i) => i.rsvp_status === "declined").length;
  const totalGuests = invitees
    .filter((i) => i.rsvp_status === "accepted")
    .reduce((sum, i) => sum + (i.guest_count ?? 0), 0);
  const totalInvited = invitees.reduce((sum, i) => sum + guestCountForName(i.name), 0);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">Anniversary Invitees</h1>
        <p className="admin-updated">
          Updated {new Date().toLocaleString("en-GB")}
        </p>
      </div>
      <SendAllButton
        recipients={invitees
          .filter((i) => i.guest_email && !i.invite_sent_at)
          .map((i) => ({ code: i.code, name: i.name }))}
      />
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-value">{totalInvited}</span>
          <span className="admin-stat-label">Invited</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{acceptedCount}</span>
          <span className="admin-stat-label">Accepted</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{declinedCount}</span>
          <span className="admin-stat-label">Declined</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{totalGuests}</span>
          <span className="admin-stat-label">Guests Attending</span>
        </div>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Invite</th>
            <th>Sent</th>
            <th>Opened</th>
            <th>Views</th>
            <th>Last Viewed</th>
            <th>RSVP</th>
            <th>Email</th>
            <th>Guests</th>
            <th>Dietary</th>
            <th>Menu</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {invitees.map((i) => (
            <tr key={i.code}>
              <td>{i.name}</td>
              <td className="admin-code">{i.code}</td>
              <td>
                <SendInviteButton code={i.code} hasEmail={!!i.guest_email} />
              </td>
              <td>{i.invite_sent_at ? new Date(i.invite_sent_at).toLocaleString("en-GB") : "—"}</td>
              <td>
                {i.invite_opened_at
                  ? `${new Date(i.invite_opened_at).toLocaleString("en-GB")} (${i.invite_open_count}x)`
                  : "—"}
              </td>
              <td>{i.view_count}</td>
              <td>{i.last_viewed_at ? new Date(i.last_viewed_at).toLocaleString("en-GB") : "—"}</td>
              <td>
                {i.rsvp_status === "accepted" && "✅ Accepted"}
                {i.rsvp_status === "declined" && "❌ Declined"}
                {!i.rsvp_status && "—"}
              </td>
              <td>{i.guest_email || "—"}</td>
              <td>{i.guest_count ?? "—"}</td>
              <td>{i.dietary_notes || "—"}</td>
              <td>
                {i.menu_choices && i.menu_choices.length
                  ? i.menu_choices.map((m, idx) => (
                      <div key={idx}>
                        {m.name}: {m.choice || "—"}
                        {m.notes ? ` (${m.notes})` : ""}
                      </div>
                    ))
                  : "—"}
              </td>
              <td>{i.message || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SeatingChart
        seats={seats}
        invitees={invitees.map((i) => ({
          code: i.code,
          name: i.name,
          guestCount: guestCountForName(i.name),
        }))}
      />
    </div>
  );
}
