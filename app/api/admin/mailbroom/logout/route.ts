import { COOKIE_NAME } from "@/lib/mailbroomAdminAuth";

export async function POST() {
  const headers = new Headers();
  headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0`);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify({ ok: true }), { headers });
}
