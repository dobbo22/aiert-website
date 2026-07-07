import { Resend } from "resend";

const MAILBROOM_NOTIFY_TO = ["mcjdobson@btopenworld.com", "Martin@aiert.co.uk"];
const MAILBROOM_FROM = process.env.MAILBROOM_EMAIL_FROM || "MailBroom for Business <admin@aiert.co.uk>";
export type TrialRequestType = "trial" | "demo";

function resend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendMailBroomTrialRequest({
  contactName,
  workEmail,
  companyName,
  userCount,
  notes,
  requestType = "trial",
}: {
  contactName: string;
  workEmail: string;
  companyName: string;
  userCount: string;
  notes: string;
  requestType?: TrialRequestType;
}) {
  const isDemo = requestType === "demo";

  const approveUrl = `https://app.mailbroom.app/admin/trials/approve?${new URLSearchParams({
    email: workEmail,
    company: companyName,
    ...(userCount ? { employees: userCount } : {}),
    ...(notes ? { notes } : {}),
  }).toString()}`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #92400e;">${isDemo ? "📞 MailBroom for Business — demo request" : "🧪 MailBroom for Business — trial request"}</h2>
      <p><strong>${escapeHtml(contactName)}</strong> at <strong>${escapeHtml(companyName)}</strong> ${isDemo ? "would like a live demo before starting a trial." : "requested a free IT assessment."}</p>
      <p><strong>Work email:</strong> ${escapeHtml(workEmail)}</p>
      <p><strong>Approx. employees:</strong> ${escapeHtml(userCount)}</p>
      ${notes ? `<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : ""}
      ${isDemo ? `
      <p style="margin-top: 24px;">
        Reply directly to this email to arrange a time — it's already addressed to <strong>${escapeHtml(workEmail)}</strong>.
      </p>
      <p style="margin-top: 16px; font-size: 13px;">
        You can also grant them a trial directly, demo or not:
      </p>
      ` : ""}
      <p style="margin-top: 12px;">
        <a href="${approveUrl}" style="display:inline-block;padding:12px 20px;background:#92400e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
          Review &amp; approve trial →
        </a>
      </p>
      <p style="margin-top: 12px; font-size: 12px; color: #78716c;">
        Opens a one-click approval screen in the staff admin — you'll still need to be signed in as AIERT staff.
      </p>
    </div>
  `;

  const { error } = await resend().emails.send({
    from: MAILBROOM_FROM,
    to: MAILBROOM_NOTIFY_TO,
    replyTo: workEmail,
    subject: isDemo ? `📞 Demo request: ${companyName}` : `🧪 Trial request: ${companyName}`,
    html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}
