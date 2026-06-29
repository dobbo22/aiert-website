import { cookies } from "next/headers";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import LoginForm from "./LoginForm";
import LogoutButton from "./LogoutButton";
import AddReviewerForm from "./AddReviewerForm";
import ReviewerRow from "./ReviewerRow";
import "../anniversary/admin.css";

export const metadata = {
  title: "MailBroom Reviewers — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  email: string;
  label: string | null;
  created_at: string;
};

export default async function AdminMailBroomReviewersPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  if (!isValidAdminSession(session)) {
    return <LoginForm />;
  }

  const reviewers = (await sql`
    SELECT id, email, label, created_at
    FROM mailbroom_reviewers
    ORDER BY created_at DESC
  `) as Row[];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">MailBroom Reviewers</h1>
        <p className="admin-updated">
          {reviewers.length} reviewer{reviewers.length === 1 ? "" : "s"} allowlisted for free Pro access
        </p>
        <LogoutButton />
      </div>

      <p style={{ color: "#94a3b8", fontSize: "0.85rem", maxWidth: 640, marginBottom: "1.5rem" }}>
        Anyone added here gets full Pro access in the live MailBroom app, free, as soon as
        they connect that exact email address — no payment, no app update needed. Only a
        SHA-256 hash of each email is ever published publicly; the plaintext addresses below
        stay in this database.
      </p>

      <AddReviewerForm />

      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Note</th>
            <th>Added</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reviewers.map((r) => (
            <ReviewerRow key={r.id} id={r.id} email={r.email} label={r.label} createdAt={r.created_at} />
          ))}
          {reviewers.length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: "#64748b", textAlign: "center", padding: "1.5rem" }}>
                No reviewers added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
