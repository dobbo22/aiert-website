import { Resend } from "resend";
import { ICS_DOWNLOAD_URL, VENUE_MAP_URL, buildGoogleCalendarUrl } from "./calendarInvite";
import { firstNamesOnly } from "./names";

const NOTIFY_TO = ["mcjdobson@btopenworld.com", "mrskarendobson@btopenworld.com"];
const FROM = process.env.EMAIL_FROM || "Martin & Karen <martin@aiert.co.uk>";

function resend() {
  return new Resend(process.env.RESEND_API_KEY);
}

type MenuChoice = {
  name: string;
  choice: "" | "meat" | "fish" | "vegetarian";
  notes: string;
};

export async function sendRsvpNotification({
  name,
  status,
  guestCount,
  dietaryNotes,
  message,
  menuChoices,
}: {
  name: string;
  status: "accepted" | "declined";
  guestCount: number;
  dietaryNotes: string;
  message: string;
  menuChoices?: MenuChoice[] | null;
}) {
  const isAre = guestCount > 1 ? "are" : "is";
  const subject =
    status === "accepted"
      ? `🎉 RSVP: ${name} ${isAre} coming!`
      : `RSVP: ${name} can't make it`;

  const menuHtml =
    menuChoices && menuChoices.length
      ? `<p><strong>Menu preference:</strong><br />${menuChoices
          .map((m) => `${m.name}: ${m.choice || "—"}${m.notes ? ` (${m.notes})` : ""}`)
          .join("<br />")}</p>`
      : "";

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #92400e;">${status === "accepted" ? "Accepted ✅" : "Declined"}</h2>
      <p><strong>${name}</strong> has ${status === "accepted" ? "accepted" : "declined"} the invitation to your 25th anniversary dinner.</p>
      ${status === "accepted" ? `<p><strong>Guests:</strong> ${guestCount}</p>` : ""}
      ${dietaryNotes ? `<p><strong>Dietary notes:</strong> ${dietaryNotes}</p>` : ""}
      ${menuHtml}
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
      <p style="margin-top: 24px;">
        <a href="https://aiert.co.uk/admin/anniversary" style="color:#92400e;">View all RSVPs in the admin dashboard →</a>
      </p>
    </div>
  `;

  const { error } = await resend().emails.send({
    from: FROM,
    to: NOTIFY_TO,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}

function detailRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(199,205,214,0.2);font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#c7cdd6;vertical-align:top;width:110px;">
        ${label}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(199,205,214,0.2);font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#ffffff;text-align:right;">
        ${value}
      </td>
    </tr>
  `;
}

export async function sendGuestConfirmation({
  name,
  email,
  menuChoices,
}: {
  name: string;
  email: string;
  menuChoices?: MenuChoice[] | null;
}) {
  const choicesMade = menuChoices?.filter((m) => m.choice) ?? [];
  const choiceLabel: Record<string, string> = { meat: "Meat", fish: "Fish", vegetarian: "Vegetarian" };

  const menuChoicesHtml = choicesMade.length
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align:left;margin-bottom:8px;">
        ${choicesMade
          .map((m) =>
            detailRow(
              m.name,
              `${choiceLabel[m.choice] ?? m.choice}${m.notes ? `<br /><span style="font-size:12px;color:#c7cdd6;">${m.notes}</span>` : ""}`
            )
          )
          .join("")}
      </table>
    `
    : "";

  const html = `
  <body style="margin:0;padding:0;background:#0a0907;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0907;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:rgba(20,17,12,0.9);border:1px solid rgba(199,205,214,0.35);border-radius:4px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:40px 32px;text-align:center;">

                <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;letter-spacing:3px;text-transform:uppercase;font-size:12px;color:#f2f4f6;">
                  You&rsquo;re Confirmed
                </p>

                <h1 style="margin:0 0 8px;font-family:'Brush Script MT',cursive;font-weight:400;font-size:38px;color:#ffffff;">
                  Martin &amp; Karen Dobson
                </h1>

                <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:16px;color:#f2f4f6;">
                  thank you for accepting
                </p>

                <div style="width:60px;height:1px;background:rgba(199,205,214,0.5);margin:0 auto 24px;"></div>

                <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.7;color:#f5f6f8;">
                  Dear ${firstNamesOnly(name)},<br />
                  we can&rsquo;t wait to celebrate our<br />
                  <em style="font-weight:bold;">25th Wedding Anniversary</em><br />
                  with you!
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align:left;margin-bottom:28px;">
                  ${detailRow("Date", "Sunday, 30th August 2026")}
                  ${detailRow("Time", "6:00pm")}
                  ${detailRow("Venue", "River Room, One Whitehall Place,<br />London SW1A 2EJ")}
                  ${detailRow("Dress Code", "Men: Black Tie<br />Ladies: Evening/Cocktail Dress")}
                </table>

                ${menuChoicesHtml}

                <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:#c7cdd6;">
                  ${choicesMade.length
                    ? "Thanks for letting us know your menu preference — a full menu will be sent for you to confirm closer to the day."
                    : "A menu (Meat / Fish / Vegetarian) will be sent for you to choose closer to the day."}
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td style="padding:0 6px;">
                      <a href="${buildGoogleCalendarUrl()}" style="display:inline-block;padding:10px 18px;border:1px solid rgba(199,205,214,0.4);color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:13px;text-decoration:none;border-radius:3px;">
                        Add to Google Calendar
                      </a>
                    </td>
                    <td style="padding:0 6px;">
                      <a href="${ICS_DOWNLOAD_URL}" style="display:inline-block;padding:10px 18px;border:1px solid rgba(199,205,214,0.4);color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:13px;text-decoration:none;border-radius:3px;">
                        Download .ics (Outlook/Apple)
                      </a>
                    </td>
                  </tr>
                </table>

                <img
                  src="https://aiert.co.uk/venue-staircase.png"
                  width="420"
                  alt="The River Room, One Whitehall Place"
                  style="display:block;width:100%;max-width:420px;height:auto;border:1px solid rgba(199,205,214,0.35);border-radius:3px;margin:0 auto 20px;"
                />

                <a href="${VENUE_MAP_URL}" style="display:inline-block;">
                  <img
                    src="https://aiert.co.uk/venue-map.png"
                    width="420"
                    height="200"
                    alt="Map to River Room, One Whitehall Place, London SW1A 2EJ"
                    style="display:block;width:100%;max-width:420px;height:auto;border:1px solid rgba(199,205,214,0.35);border-radius:3px;"
                  />
                </a>

                <p style="margin:12px 0 0;">
                  <a href="${VENUE_MAP_URL}" style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:14px;color:#c7cdd6;text-decoration:underline;">
                    Get Directions to the Venue &rarr;
                  </a>
                </p>

                <p style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:#c7cdd6;">
                  We look forward to celebrating with you.
                </p>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  `;

  const { error } = await resend().emails.send({
    from: FROM,
    to: email,
    subject: "You're confirmed — Martin & Karen's 25th Anniversary Dinner",
    html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}

export async function sendInviteEmail({
  name,
  email,
  inviteUrl,
  code,
}: {
  name: string;
  email: string;
  inviteUrl: string;
  code: string;
}) {
  const html = `
  <body style="margin:0;padding:0;background:#0a0907;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0907;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:rgba(20,17,12,0.9);border:1px solid rgba(199,205,214,0.35);border-radius:4px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:40px 32px;text-align:center;">

                <img
                  src="https://aiert.co.uk/anniversary-og.jpg"
                  width="416"
                  alt="Martin and Karen on their wedding day, in a silver ornate frame"
                  style="display:block;width:100%;max-width:416px;height:auto;border-radius:3px;margin:0 auto 24px;"
                />

                <h1 style="margin:0 0 8px;font-family:'Brush Script MT',cursive;font-weight:400;font-size:38px;color:#ffffff;">
                  Martin &amp; Karen Dobson
                </h1>

                <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:16px;color:#f2f4f6;">
                  request the pleasure of your company
                </p>

                <div style="width:60px;height:1px;background:rgba(199,205,214,0.5);margin:0 auto 24px;"></div>

                <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.7;color:#f5f6f8;">
                  Dear ${firstNamesOnly(name)},<br />
                  as Martin &amp; Karen celebrate their<br />
                  <em style="font-weight:bold;">25th Wedding Anniversary</em><br />
                  they warmly invite you to join them for dinner.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align:left;margin-bottom:28px;">
                  ${detailRow("Date", "Sunday, 30th August 2026")}
                  ${detailRow("Time", "6:00pm")}
                  ${detailRow("Venue", "River Room, One Whitehall Place,<br />London SW1A 2EJ")}
                  ${detailRow("Dress Code", "Men: Black Tie<br />Ladies: Evening/Cocktail Dress")}
                </table>

                <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;background-color:#f2f4f6;border:1px solid #f2f4f6;color:#14110c;font-weight:700;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;border-radius:3px;letter-spacing:0.03em;">
                  View Invitation &amp; RSVP &rarr;
                </a>

                <p style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#8d94a0;word-break:break-all;">
                  Or copy this link: <a href="${inviteUrl}" style="color:#c7cdd6;text-decoration:underline;">${inviteUrl}</a>
                </p>

                <p style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:#c7cdd6;">
                  We look forward to celebrating with you.
                </p>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <img src="https://aiert.co.uk/api/email-open?code=${encodeURIComponent(code)}" width="1" height="1" alt="" style="display:none;" />
  </body>
  `;

  const { error } = await resend().emails.send({
    from: FROM,
    to: email,
    subject: "You're Invited — Martin & Karen's 25th Wedding Anniversary Dinner",
    html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}

export async function sendWhatsAppFollowUpDigest({
  guests,
}: {
  guests: { name: string; code: string; sentAt: string }[];
}) {
  const baseUrl = process.env.SITE_URL || "https://aiert.co.uk";

  const rowsHtml = guests
    .map(
      (g) =>
        `<li><strong>${g.name}</strong> — sent ${new Date(g.sentAt).toLocaleDateString(
          "en-GB"
        )}, still unread. <a href="${baseUrl}/admin/anniversary">Send via WhatsApp →</a></li>`
    )
    .join("");

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #92400e;">📱 WhatsApp follow-up suggested</h2>
      <p>The following guests haven't opened or viewed their invite email after 48+ hours:</p>
      <ul>${rowsHtml}</ul>
      <p style="margin-top: 24px;">
        <a href="${baseUrl}/admin/anniversary" style="color:#92400e;">Open the admin dashboard →</a>
      </p>
    </div>
  `;

  const { error } = await resend().emails.send({
    from: FROM,
    to: NOTIFY_TO,
    subject: `📱 ${guests.length} guest${guests.length > 1 ? "s" : ""} need a WhatsApp follow-up`,
    html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}
