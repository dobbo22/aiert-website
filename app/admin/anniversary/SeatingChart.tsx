"use client";

import { useState } from "react";

type Seat = {
  seat_id: number;
  side: "top" | "left" | "right";
  invitee_code: string | null;
  guest_label: string | null;
};

type Invitee = {
  code: string;
  name: string;
};

type Props = {
  seats: Seat[];
  invitees: Invitee[];
};

export default function SeatingChart({ seats: initialSeats, invitees }: Props) {
  const [seats, setSeats] = useState(initialSeats);
  const [activeSeat, setActiveSeat] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const seatById = (id: number) => seats.find((s) => s.seat_id === id);
  const nameForCode = (code: string | null) =>
    code ? invitees.find((i) => i.code === code)?.name ?? code : null;

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
    const label = seat?.guest_label || nameForCode(seat?.invitee_code ?? null);
    const isActive = activeSeat === id;

    return (
      <div className="seat-wrap" key={id}>
        <button
          type="button"
          className={`seat-disc ${label ? "seat-filled" : ""}`}
          onClick={() => setActiveSeat(isActive ? null : id)}
          title={label ?? `Seat ${id}`}
        >
          {label ? initials(label) : id}
        </button>
        {label && <span className="seat-name">{label}</span>}

        {isActive && (
          <div className="seat-popover">
            <select
              defaultValue=""
              onChange={(e) => {
                const code = e.target.value;
                if (!code) return;
                const name = invitees.find((i) => i.code === code)?.name ?? "";
                assign(id, code, name);
              }}
            >
              <option value="" disabled>
                Assign guest…
              </option>
              {invitees.map((inv) => (
                <option key={inv.code} value={inv.code}>
                  {inv.name}
                </option>
              ))}
            </select>
            {label && (
              <input
                type="text"
                className="seat-label-input"
                placeholder="Custom label (e.g. first name)"
                defaultValue={seat?.guest_label ?? ""}
                onBlur={(e) => assign(id, seat?.invitee_code ?? null, e.target.value || null)}
              />
            )}
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
