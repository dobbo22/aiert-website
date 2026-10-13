import { promises as dns } from "dns";

// Checks that each queued person's email domain can receive mail at all (it has mail servers). People at
// dead domains (a company that closed, a lapsed domain) would only bounce, so they are marked don't send.
export async function hasMail(domain: string): Promise<boolean> {
  const lookup = async () => {
    try {
      const mx = await dns.resolveMx(domain);
      if (mx.length > 0) return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENODATA" && code !== "ENOTFOUND") throw err; // timeouts etc.: treated as "unknown", kept
    }
    // No MX: mail can still go to the domain's address record, per the standard fallback.
    try {
      const a = await dns.resolve4(domain);
      return a.length > 0;
    } catch {
      return false;
    }
  };
  try {
    return await Promise.race([lookup(), new Promise<boolean>((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))]);
  } catch {
    return true; // couldn't tell: keep rather than wrongly drop someone
  }
}

