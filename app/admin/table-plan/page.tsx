import { cookies } from "next/headers";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/adminAuth";
import LoginForm from "../anniversary/LoginForm";
import LogoutButton from "../anniversary/LogoutButton";
import AutoRefresh from "../anniversary/AutoRefresh";
import SeatingChart from "../anniversary/SeatingChart";
import { guestCountForName } from "@/lib/guestCount";
import "../anniversary/admin.css";

export const metadata = {
  title: "Table Plan — Admin",
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
  rsvp_status: "accepted" | "declined" | null;
  guest_count: number | null;
  menu_choices: MenuChoice[] | null;
};

type SeatRow = {
  seat_id: number;
  side: "top" | "left" | "right";
  invitee_code: string | null;
  guest_label: string | null;
};

export default async function AdminTablePlanPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  if (!isValidAdminSession(session)) {
    return <LoginForm />;
  }

  const invitees = (await sql`
    SELECT code, name, rsvp_status, guest_count, menu_choices
    FROM anniversary_invitees
    ORDER BY name ASC
  `) as Row[];

  const seats = (await sql`
    SELECT seat_id, side, invitee_code, guest_label
    FROM anniversary_seats
    ORDER BY seat_id ASC
  `) as SeatRow[];

  return (
    <div className="admin-page">
      <AutoRefresh intervalSeconds={30} />
      <div className="admin-header">
        <h1 className="admin-title">Table Plan</h1>
        <p className="admin-updated">
          Updated {new Date().toLocaleString("en-GB")} · auto-refreshes every 30s
        </p>
        <a href="/admin/anniversary" className="admin-logout-btn" style={{ marginRight: "0.5rem" }}>
          ← Invitees
        </a>
        <LogoutButton />
      </div>

      <SeatingChart
        seats={seats}
        invitees={invitees.map((i) => ({
          code: i.code,
          name: i.name,
          guestCount: guestCountForName(i.name),
          rsvpStatus: i.rsvp_status,
          menuChoices: i.menu_choices,
        }))}
      />
    </div>
  );
}
