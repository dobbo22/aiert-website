// A real (in-memory) Postgres for tests: the app's database module is replaced by PGlite behind the same tagged-template call, so
// the actual SQL the business admin runs is exercised, with no network and no real data. Also stubs the pieces of Next that need a
// live request (cookies, the admin session), driven from `ctx`.
import Module from "node:module";
import { PGlite } from "@electric-sql/pglite";

export const ctx: { session: { orgId: string; email: string; support?: boolean } | null; admin: boolean; cookie: string | undefined } = { session: null, admin: true, cookie: undefined };
const db = new PGlite();

function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
  return db.query(text, values as never[]).then((r) => r.rows);
}

const realLoad = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
let installed = false;
export function installStubs(opts: { realSession?: boolean } = {}) {
  if (installed) return;
  installed = true;
  process.env.TAPCARD_BIZ_SESSION_SECRET = "test-secret-for-tests";
  process.env.ADMIN_PASSWORD = "test-admin";
  (Module as unknown as { _load: (...a: unknown[]) => unknown })._load = function (this: unknown, ...args: unknown[]) {
    const [request, ...rest] = args as [string, ...unknown[]];
    if (request === "@/lib/db" || request.endsWith("/lib/db")) return { __esModule: true, default: sql };
    if (request === "@vercel/blob") return { del: async () => {}, put: async () => ({ url: "https://blob.test/x" }) };
    if (request === "@/lib/adminRequest" || request.endsWith("/lib/adminRequest")) return { isAdminRequest: async () => ctx.admin };
    if (request === "next/headers") return { cookies: async () => ({ get: () => (ctx.cookie ? { value: ctx.cookie } : undefined) }) };
    if (!opts.realSession && (request === "@/lib/tapcardBizSession" || request.endsWith("/lib/tapcardBizSession"))) {
      return { requireBizSession: async () => ctx.session };
    }
    return realLoad.call(this, request, ...rest);
  };
}
export { sql };
