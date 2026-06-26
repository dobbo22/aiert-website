import Image from "next/image";
import sql from "@/lib/db";
import "../anniversary.css";
import ViewTracker from "./ViewTracker";
import RsvpForm from "./RsvpForm";
import { guestCountForName } from "@/lib/guestCount";
import { guestFirstNames } from "@/lib/names";

type MenuChoice = {
  name: string;
  choice: "" | "meat" | "fish" | "vegetarian";
  notes: string;
};

type Invitee = {
  code: string;
  name: string;
  rsvp_status: "accepted" | "declined" | null;
  guest_count: number | null;
  dietary_notes: string | null;
  message: string | null;
  guest_email: string | null;
  menu_choices: MenuChoice[] | null;
};

async function getInvitee(code: string): Promise<Invitee | null> {
  const rows = await sql`
    SELECT code, name, rsvp_status, guest_count, dietary_notes, message, guest_email, menu_choices
    FROM anniversary_invitees
    WHERE code = ${code}
  `;
  return (rows[0] as Invitee) ?? null;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const invitee = await getInvitee(code);

  if (!invitee) {
    return (
      <div className="anniv-page">
        <div className="anniv-card">
          <p className="anniv-eyebrow">Invitation Not Found</p>
          <p className="anniv-body">
            We couldn&apos;t find an invitation matching this link. Please check the
            link and try again, or contact Martin &amp; Karen directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="anniv-page">
      <ViewTracker code={code} />
      <div className="anniv-card">
        <div className="anniv-photo-wrap">
          <Image
            src="/anniversary-framed.png"
            alt="Martin and Karen on their wedding day, in a silver ornate frame"
            width={2752}
            height={1536}
            className="anniv-photo"
            priority
          />
        </div>
        <h1 className="anniv-title">Martin &amp; Karen Dobson</h1>

        <div className="anniv-intro">
          <p className="anniv-sub">request the pleasure of your company</p>
          <p className="anniv-body">
            as they celebrate their<br />
            <strong className="anniv-occasion">25th Wedding Anniversary</strong>
          </p>
        </div>

        <div className="anniv-divider" />

        <p className="anniv-body">
          and warmly invite
          <br />
          <span className="anniv-guest-name">{invitee.name}</span>
          <br />
          to join them for dinner.
        </p>

        <div className="anniv-divider" />

        <div className="anniv-details">
          <div className="anniv-detail-row">
            <span className="anniv-detail-label">Date</span>
            <span className="anniv-detail-value">Sunday, 30th August 2026</span>
          </div>
          <div className="anniv-detail-row">
            <span className="anniv-detail-label">Time</span>
            <span className="anniv-detail-value">6:00pm</span>
          </div>
          <div className="anniv-detail-row">
            <span className="anniv-detail-label">Venue</span>
            <span className="anniv-detail-value">River Room, One Whitehall Place, London SW1A 2EJ</span>
          </div>
          <div className="anniv-detail-row">
            <span className="anniv-detail-label">Dress Code</span>
            <span className="anniv-detail-value">Men: Black Tie<br />Ladies: Evening/Cocktail Dress</span>
          </div>
        </div>

        <RsvpForm
          code={code}
          guestCount={guestCountForName(invitee.name)}
          guestNames={guestFirstNames(invitee.name)}
          initialStatus={invitee.rsvp_status}
          initialMessage={invitee.message}
          initialEmail={invitee.guest_email}
          initialMenuChoices={invitee.menu_choices}
        />
      </div>
    </div>
  );
}
