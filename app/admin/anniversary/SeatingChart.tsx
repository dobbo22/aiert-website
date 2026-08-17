"use client";

import { useEffect, useState } from "react";
import { splitCoupleName } from "@/lib/names";

type Seat = {
  seat_id: number;
  side: "top" | "left" | "right";
  invitee_code: string | null;
  guest_label: string | null;
};

type MenuChoice = {
  name: string;
  choice: "" | "meat" | "fish" | "vegetarian";
  notes: string;
};

type Invitee = {
  code: string;
  name: string;
  guestCount: number;
  rsvpStatus: "accepted" | "declined" | null;
  menuChoices: MenuChoice[] | null;
};

type Individual = {
  code: string;
  label: string;
};

type Props = {
  seats: Seat[];
  invitees: Invitee[];
};

function buildIndividuals(invitees: Invitee[]): Individual[] {
  return invitees
    .filter((inv) => inv.rsvpStatus !== "declined")
    .flatMap((inv) => {
      if (inv.guestCount > 1) {
        const [a, b] = splitCoupleName(inv.name);
        return [
          { code: inv.code, label: a },
          { code: inv.code, label: b },
        ];
      }
      return [{ code: inv.code, label: inv.name }];
    });
}

function menuEntryFor(invitees: Invitee[], code: string | null, label: string | null): MenuChoice | null {
  if (!code || !label) return null;
  const invitee = invitees.find((inv) => inv.code === code);
  const firstName = label.split(/\s+/)[0].toLowerCase();
  return invitee?.menuChoices?.find((m) => m.name.toLowerCase() === firstName) ?? null;
}

function choiceLabel(choice: MenuChoice["choice"] | null) {
  switch (choice) {
    case "meat":
      return "Meat";
    case "fish":
      return "Fish";
    case "vegetarian":
      return "Veg";
    default:
      return "No choice yet";
  }
}

export default function SeatingChart({ seats: initialSeats, invitees }: Props) {
  const [seats, setSeats] = useState(initialSeats);
  const [activeSeat, setActiveSeat] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const individuals = buildIndividuals(invitees);
  const declinedCodes = new Set(
    invitees.filter((inv) => inv.rsvpStatus === "declined").map((inv) => inv.code)
  );

  useEffect(() => {
    const toClear = seats.filter((s) => s.invitee_code && declinedCodes.has(s.invitee_code));
    toClear.forEach((s) => assign(s.seat_id, null, null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitees]);

  const seatById = (id: number) => seats.find((s) => s.seat_id === id);

  const assignedKeys = new Set(
    seats.filter((s) => s.invitee_code && s.guest_label).map((s) => `${s.invitee_code}|${s.guest_label}`)
  );

  async function assign(seatId: number, code: string | null, guestLabel: string | null) {
    setSaving(true);
    setSeats((prev) =>
      prev.map((s) => (s.seat_id === seatId ? { ...s, invitee_code: code, guest_label: guestLabel } : s))
    );
    setActiveSeat(null);
    try {
      await fetch("/api/admin/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId, code, guestLabel }),
      });
    } finally {
      setSaving(false);
    }
  }

  function renderSeat(id: number) {
    const seat = seatById(id);
    const label = seat?.guest_label;
    const isActive = activeSeat === id;
    const menuEntry = label ? menuEntryFor(invitees, seat?.invitee_code ?? null, label) : null;
    const choice = menuEntry?.choice || null;
    const allergen = menuEntry?.notes?.trim() || "";

    const titleParts = label ? [`${label} — ${choiceLabel(choice)}`] : [`Seat ${id}`];
    if (allergen) titleParts.push(`Allergen: ${allergen}`);

    return (
      <div className="seat-wrap" key={id}>
        <button
          type="button"
          className={`seat-disc ${label ? `seat-fill-${choice ?? "none"}` : ""}`}
          onClick={() => setActiveSeat(isActive ? null : id)}
          title={titleParts.join(" — ")}
        >
          {label ? initials(label) : id}
          {allergen && <span className="seat-allergen-badge">!</span>}
        </button>
        {label && <span className="seat-name">{label}</span>}
        {label && <span className={`seat-choice-label seat-choice-text-${choice ?? "none"}`}>{choiceLabel(choice)}</span>}
        {allergen && <span className="seat-allergen-text">⚠ {allergen}</span>}

        {isActive && (
          <div className="seat-popover">
            <label htmlFor={`seat-select-${id}`} className="seat-popover-label">
              Assign guest
            </label>
            <select
              id={`seat-select-${id}`}
              aria-label="Assign guest to this seat"
              value=""
              onChange={(e) => {
                const idx = Number(e.target.value);
                if (Number.isNaN(idx)) return;
                const person = individuals[idx];
                if (!person) return;

                const existingSeat = seats.find(
                  (s) => s.invitee_code === person.code && s.guest_label === person.label && s.seat_id !== id
                );
                if (existingSeat) assign(existingSeat.seat_id, null, null);
                assign(id, person.code, person.label);
              }}
            >
              <option value="" disabled>
                Assign guest…
              </option>
              {individuals.map((person, idx) => {
                const key = `${person.code}|${person.label}`;
                const isCurrentSeat = seat?.invitee_code === person.code && seat?.guest_label === person.label;
                const seatedElsewhere = assignedKeys.has(key) && !isCurrentSeat;
                return (
                  <option key={`${key}-${idx}`} value={idx}>
                    {person.label}
                    {seatedElsewhere ? " (seated)" : ""}
                  </option>
                );
              })}
            </select>
            <button type="button" className="seat-clear" onClick={() => assign(id, null, null)}>
              Clear seat
            </button>
          </div>
        )}
      </div>
    );
  }

  const topSeats = seats.filter((s) => s.side === "top").map((s) => s.seat_id);
  const leftSeats = seats.filter((s) => s.side === "left").map((s) => s.seat_id);
  const rightSeats = seats.filter((s) => s.side === "right").map((s) => s.seat_id);

  return (
    <div className="seating-section">
      <h2 className="admin-subtitle">Table Plan {saving && <span className="seat-saving">saving…</span>}</h2>
      <div className="seating-legend">
        <span className="seating-legend-item">
          <span className="seating-legend-dot seat-choice-meat" /> Meat
        </span>
        <span className="seating-legend-item">
          <span className="seating-legend-dot seat-choice-fish" /> Fish
        </span>
        <span className="seating-legend-item">
          <span className="seating-legend-dot seat-choice-vegetarian" /> Veg
        </span>
        <span className="seating-legend-item">
          <span className="seating-legend-dot seat-choice-none" /> No choice yet
        </span>
        <span className="seating-legend-item">
          <span className="seating-legend-allergen">!</span> Allergen — hover seat for details
        </span>
      </div>
      <div className="seating-u">
        <div className="seating-top">{topSeats.map(renderSeat)}</div>
        <div className="seating-sides">
          <div className="seating-side seating-left">{leftSeats.map(renderSeat)}</div>
          <div className="seating-open" />
          <div className="seating-side seating-right">{rightSeats.map(renderSeat)}</div>
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
