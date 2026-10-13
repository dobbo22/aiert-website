"use client";

import { useState } from "react";

export default function BookingDemo({ initialStep }: { initialStep: "form" | "filled" | "done" }) {
  const filled = initialStep !== "form";
  const [done, setDone] = useState(initialStep === "done");
  const [name, setName] = useState(filled ? "Jamie Fox" : "");
  const [date, setDate] = useState(filled ? "Friday 23 October" : "");
  const [time, setTime] = useState(filled ? "7:30 pm" : "");
  const [party, setParty] = useState(filled ? "2" : "2");

  const field = "mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318]";
  return (
    <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-white ring-1 ring-white/10">
      <p className="text-sm tracking-widest text-white/80">THE OLIVE TABLE</p>
      {done ? (
        <>
          <h1 className="mt-3 text-2xl font-bold">You&apos;re booked</h1>
          <p className="mt-4 text-lg">{name || "Jamie Fox"}, table for {party}</p>
          <p className="text-lg">{date || "Friday 23 October"} at {time || "7:30 pm"}</p>
          <p className="mt-6 text-white/80">We look forward to seeing you at 12 Warrington Crescent, London W9.</p>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
          <h1 className="mt-3 text-2xl font-bold">Book a table</h1>
          <label className="mt-5 block text-sm" htmlFor="n">Name</label>
          <input id="n" className={field} value={name} onChange={(e) => setName(e.target.value)} />
          <label className="mt-4 block text-sm" htmlFor="d">Date</label>
          <input id="d" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="mt-4 flex gap-3">
            <div className="flex-1">
              <label className="block text-sm" htmlFor="t">Time</label>
              <input id="t" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="w-24">
              <label className="block text-sm" htmlFor="p">People</label>
              <input id="p" className={field} value={party} onChange={(e) => setParty(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318]">Book</button>
        </form>
      )}
      <p className="mt-8 text-xs text-white/70">Demo restaurant for TapCard. Not a real booking.</p>
    </div>
  );
}
