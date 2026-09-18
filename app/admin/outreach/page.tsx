import { cookies } from "next/headers";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import LoginForm from "../mailbroom/LoginForm";
import AdminHeader from "../AdminHeader";
import AddOutreachForm from "./AddOutreachForm";
import OutreachRow from "./OutreachRow";
import "../mailbroom/admin.css";
import "./outreach.css";

export const metadata = {
  title: "Influencer Outreach — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  name: string;
  platform: string | null;
  contact: string | null;
  reach: string | null;
  content_focus: string | null;
  status: string;
  notes: string | null;
  sent_at: string | null;
};

export default async function OutreachAdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  if (!isValidAdminSession(session)) {
    return <LoginForm />;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS mailbroom_influencer_outreach (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT,
      contact TEXT,
      reach TEXT,
      content_focus TEXT,
      status TEXT NOT NULL DEFAULT 'Not sent',
      notes TEXT,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const rows = (await sql`
    SELECT id, name, platform, contact, reach, content_focus, status, notes, sent_at
    FROM mailbroom_influencer_outreach
    ORDER BY sent_at DESC NULLS LAST, created_at DESC
  `) as Row[];

  const repliedCount = rows.filter((r) => r.status.startsWith("Replied") || r.status === "Confirmed" || r.status === "Posted").length;
  const sentCount = rows.filter((r) => r.status !== "Not sent").length;

  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <AdminHeader />
      <div className="admin-page">
        <h1 className="admin-title" style={{ marginBottom: "0.5rem" }}>
          Influencer Outreach
        </h1>
        <p className="admin-mailbroom-note">
          Creator/influencer contacts for MailBroom — send and track replies directly from
          martin@mailbroom.app via Microsoft Graph.
        </p>

        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat-value">{rows.length}</span>
            <span className="admin-stat-label">Total contacts</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{sentCount}</span>
            <span className="admin-stat-label">Contacted</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{repliedCount}</span>
            <span className="admin-stat-label">Replied</span>
          </div>
        </div>

        <AddOutreachForm />

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Platform</th>
                <th>Contact</th>
                <th>Reach</th>
                <th>Sent</th>
                <th>Status</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <OutreachRow
                  key={r.id}
                  id={r.id}
                  name={r.name}
                  platform={r.platform}
                  contact={r.contact}
                  reach={r.reach}
                  contentFocus={r.content_focus}
                  status={r.status}
                  notes={r.notes}
                  sentAt={r.sent_at}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-empty-cell">
                    No contacts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
