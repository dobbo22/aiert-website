import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";

export async function isAdminRequest(): Promise<boolean> {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}
