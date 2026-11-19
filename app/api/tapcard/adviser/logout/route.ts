import { NextResponse } from "next/server";
import { ADVISER_COOKIE } from "@/lib/tapcardAdvisers";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADVISER_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
