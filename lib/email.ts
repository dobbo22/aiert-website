import nodemailer from "nodemailer";
import { buildAnniversaryIcs, VENUE_MAP_URL } from "./calendarInvite";

const NOTIFY_TO = "mcjdobson@btopenworld.com, mrskarendobson@btopenworld.com";

function transporter() {
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "mail.btinternet.com",
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendRsvpNotification({
  name,
  status,
  guestCount,
  dietaryNotes,
  message,
}: {
  name: string;
  status: "accepted" | "declined";
  guestCount: number;
  dietaryNotes: string;
  message: string;
}) {
  const isAre = guestCount > 1 ? "are" : "is";
  const subject =
    status === "accepted"
      ? `🎉 RSVP: ${name} ${isAre} coming!`
      : `RSVP: ${name} can't make it`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #92400e;">${status === "accepted" ? "Accepted ✅" : "Declined"}</h2>
      <p><strong>${name}</strong> has ${status === "accepted" ? "accepted" : "declined"} the invitation to your 25th anniversary dinner.</p>
      ${status === "accepted" ? `<p><strong>Guests:</strong> ${guestCount}</p>` : ""}
      ${dietaryNotes ? `<p><strong>Dietary notes:</strong> ${dietaryNotes}</p>` : ""}
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
    </div>
  `;

  await transporter().sendMail({
    from: process.env.SMTP_SENDER || process.env.SMTP_USER,
    to: NOTIFY_TO,
    subject,
    html,
  });
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
}: {
  name: string;
  email: string;
}) {
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
                  Dear ${name},<br />
                  we can&rsquo;t wait to celebrate Martin &amp; Karen&rsquo;s<br />
                  <em style="font-weight:bold;">25th Wedding Anniversary</em><br />
                  with you!
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align:left;margin-bottom:28px;">
                  ${detailRow("Date", "Sunday, 30th August 2026")}
                  ${detailRow("Time", "6:00pm")}
                  ${detailRow("Venue", "River Room, One Whitehall Place,<br />London SW1A 2EJ")}
                  ${detailRow("Dress Code", "Men: Black Tie<br />Ladies: Evening/Cocktail Dress")}
                </table>

                <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#f5f6f8;">
                  A calendar invite for the evening is attached.
                </p>

                <a href="${VENUE_MAP_URL}" style="display:inline-block;">
                  <img
                    src="https://staticmap.openstreetmap.de/staticmap.php?center=51.5072,-0.1246&zoom=16&size=420x200&maptype=mapnik&markers=51.5072,-0.1246,red-pushpin"
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

  await transporter().sendMail({
    from: process.env.SMTP_SENDER || process.env.SMTP_USER,
    to: email,
    subject: "You're confirmed — Martin & Karen's 25th Anniversary Dinner",
    html,
    icalEvent: {
      filename: "anniversary-dinner.ics",
      content: buildAnniversaryIcs(),
    },
  });
}
