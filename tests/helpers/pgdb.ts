// A real (in-memory) Postgres for tests: the app's database module is replaced by PGlite behind the same tagged-template call, so
// the actual SQL the business admin runs is exercised, with no network and no real data. Also stubs the pieces of Next that need a
// live request (cookies, the admin session), driven from `ctx`.
import Module from "node:module";
import { PGlite } from "@electric-sql/pglite";

export const stubs: { findSiteLinks?: (...a: unknown[]) => unknown } = {};
export const ctx: { session: { orgId: string; email: string; support?: boolean } | null; admin: boolean; cookie: string | undefined; outbox: { to: string; subject: string; html: string; text: string }[] } = { session: null, admin: true, cookie: undefined, outbox: [] };
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
  process.env.TAPCARD_INVITE_EMAIL_VIA = "resend";
  process.env.RESEND_API_KEY = "re_test";
  (Module as unknown as { _load: (...a: unknown[]) => unknown })._load = function (this: unknown, ...args: unknown[]) {
    const [request, ...rest] = args as [string, ...unknown[]];
    if (request === "@/lib/db" || request.endsWith("/lib/db")) return { __esModule: true, default: sql };
    // Emails go to an outbox the tests can read instead of the network.
    if (request === "resend") {
      return { Resend: class { emails = { send: async (m: { to: string; subject: string; html: string; text: string }) => { ctx.outbox.push({ to: m.to, subject: m.subject, html: m.html, text: m.text }); return { error: null }; } }; } };
    }
    // `after()` only exists inside a real request: here the callback runs straight away (its failures are ignored, as in production).
    if (request === "next/server") {
      const real = realLoad.call(this, request, ...rest) as Record<string, unknown>;
      return { ...real, after: (task: unknown) => { void Promise.resolve(typeof task === "function" ? (task as () => unknown)() : task).catch(() => {}); } };
    }
    if (request === "next/navigation") {
      return { useRouter: () => ({ refresh() {}, push() {}, replace() {}, back() {} }), usePathname: () => "/business/admin", useSearchParams: () => new URLSearchParams(), redirect() {}, notFound() {} };
    }
    // A test can stand in for reading a website (no network): see `stubs.findSiteLinks`.
    if (request === "@/lib/siteLinks" || request.endsWith("/lib/siteLinks")) {
      const real = realLoad.call(this, request, ...rest) as Record<string, unknown>;
      return { ...real, findSiteLinks: (...a: unknown[]) => (stubs.findSiteLinks ? stubs.findSiteLinks(...a) : (real.findSiteLinks as (...b: unknown[]) => unknown)(...a)) };
    }
    if (request === "@vercel/blob") return { del: async () => {}, put: async () => ({ url: "https://blob.test/x" }) };
    if (request === "@/lib/adminRequest" || request.endsWith("/lib/adminRequest")) return { isAdminRequest: async () => ctx.admin };
    if (request === "next/headers") return { cookies: async () => ({ get: () => (ctx.cookie ? { value: ctx.cookie } : undefined) }) };
    if (!opts.realSession && (request === "@/lib/tapcardBizSession" || request.endsWith("/lib/tapcardBizSession"))) {
      return { requireBizSession: async () => (ctx.session ? { role: "admin", locationIds: [], ...ctx.session } : null), requireBizUser: async () => (ctx.session ? { role: "admin", locationIds: [], ...ctx.session } : null) };
    }
    return realLoad.call(this, request, ...rest);
  };
}
export { sql };
