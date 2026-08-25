"use client";

import { useEffect, useState, type DragEvent } from "react";
import { splitCoupleName } from "@/lib/names";

type Seat = {
  seat_id: number;
  side: "top" | "left" | "right";
  invitee_code: string | null;
  guest_label: string | null;
  seat_number: number | null;
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

type DragPayload = {
  code: string;
  label: string;
  sourceSeatId: number | null;
};

export default function SeatingChart({ seats: initialSeats, invitees }: Props) {
  const [seats, setSeats] = useState(initialSeats);
  const [activeSeat, setActiveSeat] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOverSeat, setDragOverSeat] = useState<number | null>(null);
  const [dragOverSidebar, setDragOverSidebar] = useState(false);

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

  const unseated = individuals.filter((p) => !assignedKeys.has(`${p.code}|${p.label}`));

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

  function readDragPayload(e: DragEvent<HTMLElement>): DragPayload | null {
    try {
      const raw = e.dataTransfer.getData("text/plain");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function handleSeatDrop(e: DragEvent<HTMLElement>, targetSeatId: number) {
    e.preventDefault();
    setDragOverSeat(null);
    const payload = readDragPayload(e);
    if (!payload) return;
    if (payload.sourceSeatId === targetSeatId) return;
    if (payload.sourceSeatId !== null) assign(payload.sourceSeatId, null, null);
    assign(targetSeatId, payload.code, payload.label);
  }

  function handleSidebarDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragOverSidebar(false);
    const payload = readDragPayload(e);
    if (!payload || payload.sourceSeatId === null) return;
    assign(payload.sourceSeatId, null, null);
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
          draggable={!!label}
          className={`seat-disc ${label ? `seat-fill-${choice ?? "none"}` : ""} ${dragOverSeat === id ? "seat-drag-over" : ""}`}
          onClick={() => setActiveSeat(isActive ? null : id)}
          onDragStart={(e) => {
            if (!label || !seat?.invitee_code) return;
            e.dataTransfer.setData(
              "text/plain",
              JSON.stringify({ code: seat.invitee_code, label, sourceSeatId: id })
            );
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverSeat(id);
          }}
          onDragLeave={() => setDragOverSeat((cur) => (cur === id ? null : cur))}
          onDrop={(e) => handleSeatDrop(e, id)}
          title={titleParts.join(" — ")}
        >
          {label ? initials(label) : (seat?.seat_number ?? id)}
          {label && seat?.seat_number != null && (
            <span className="seat-number-badge">{seat.seat_number}</span>
          )}
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
                if (seatedElsewhere) return null;
                return (
                  <option key={`${key}-${idx}`} value={idx}>
                    {person.label}
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
      <div className="seating-layout">
        <div className="seating-u">
          <div className="seating-top">{topSeats.map(renderSeat)}</div>
          <div className="seating-sides">
            <div className="seating-side seating-left">{leftSeats.map(renderSeat)}</div>
            <div className="seating-open" />
            <div className="seating-side seating-right">{rightSeats.map(renderSeat)}</div>
          </div>
        </div>

        <div
          className={`unseated-panel ${dragOverSidebar ? "unseated-panel-drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverSidebar(true);
          }}
          onDragLeave={() => setDragOverSidebar(false)}
          onDrop={handleSidebarDrop}
        >
          <h3 className="unseated-title">Unseated ({unseated.length})</h3>
          {unseated.length === 0 ? (
            <p className="unseated-empty">Everyone has a seat.</p>
          ) : (
            <div className="unseated-list">
              {unseated.map((person) => (
                <div
                  key={`${person.code}|${person.label}`}
                  className="unseated-chip"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({ code: person.code, label: person.label, sourceSeatId: null })
                    );
                  }}
                >
                  {person.label}
                </div>
              ))}
            </div>
          )}
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
