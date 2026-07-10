import { cookies } from "next/headers";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/adminAuth";
import LoginForm from "./LoginForm";
import SeatingChart from "./SeatingChart";
import SendAllButton from "./SendAllButton";
import LogoutButton from "./LogoutButton";
import InviteeRow from "./InviteeRow";
import AutoRefresh from "./AutoRefresh";
import { guestCountForName } from "@/lib/guestCount";
import "./admin.css";

const SITE_URL = process.env.SITE_URL || "https://aiert.co.uk";

function needsWhatsAppFollowUp(i: {
  invite_sent_at: string | null;
  invite_opened_at: string | null;
  view_count: number;
  rsvp_status: string | null;
}): boolean {
  if (!i.invite_sent_at || i.invite_opened_at || i.view_count > 0 || i.rsvp_status) return false;
  const hoursSinceSent = (Date.now() - new Date(i.invite_sent_at).getTime()) / (1000 * 60 * 60);
  return hoursSinceSent >= 48;
}

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
  whatsapp_sent: boolean;
  phone_number: string | null;
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
           invite_sent_at, invite_opened_at, invite_open_count, whatsapp_sent, phone_number
    FROM anniversary_invitees
    ORDER BY name ASC
  `) as Row[];

  const seats = (await sql`
    SELECT seat_id, side, invitee_code, guest_label
    FROM anniversary_seats
    ORDER BY seat_id ASC
  `) as SeatRow[];

  const acceptedCount = invitees
    .filter((i) => i.rsvp_status === "accepted")
    .reduce((sum, i) => sum + guestCountForName(i.name), 0);
  const declinedCount = invitees
    .filter((i) => i.rsvp_status === "declined")
    .reduce((sum, i) => sum + guestCountForName(i.name), 0);
  const totalGuests = invitees
    .filter((i) => i.rsvp_status === "accepted")
    .reduce((sum, i) => sum + (i.guest_count ?? 0), 0);
  const totalInvited = invitees.reduce((sum, i) => sum + guestCountForName(i.name), 0);

  return (
    <div className="admin-page">
      <AutoRefresh intervalSeconds={30} />
      <div className="admin-header">
        <h1 className="admin-title">Anniversary Invitees</h1>
        <p className="admin-updated">
          Updated {new Date().toLocaleString("en-GB")} · auto-refreshes every 30s
        </p>
        <LogoutButton />
      </div>
      <SendAllButton
        recipients={invitees
          .filter(
            (i) =>
              i.guest_email &&
              !i.invite_sent_at &&
              i.rsvp_status !== "accepted" &&
              !i.whatsapp_sent
          )
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
      <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Invite</th>
            <th>WhatsApp</th>
            <th>Sent</th>
            <th>Opened</th>
            <th>Views</th>
            <th>Last Viewed</th>
            <th>RSVP</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Guests</th>
            <th>Dietary</th>
            <th>Menu</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {invitees.map((i) => (
            <InviteeRow
              key={i.code}
              code={i.code}
              name={i.name}
              viewCount={i.view_count}
              lastViewedAt={i.last_viewed_at}
              rsvpStatus={i.rsvp_status}
              guestCount={i.guest_count}
              dietaryNotes={i.dietary_notes}
              menuChoices={i.menu_choices}
              message={i.message}
              initialEmail={i.guest_email}
              initialPhone={i.phone_number}
              inviteSentAt={i.invite_sent_at}
              inviteOpenedAt={i.invite_opened_at}
              inviteOpenCount={i.invite_open_count}
              whatsappSent={i.whatsapp_sent}
              siteUrl={SITE_URL}
              needsFollowUp={needsWhatsAppFollowUp(i)}
            />
          ))}
        </tbody>
      </table>
      </div>

      <SeatingChart
        seats={seats}
        invitees={invitees.map((i) => ({
          code: i.code,
          name: i.name,
          guestCount: guestCountForName(i.name),
          rsvpStatus: i.rsvp_status,
        }))}
      />
    </div>
  );
}
