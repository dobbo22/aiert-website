import { test } from "node:test";
import assert from "node:assert/strict";

// The database is not available here, so this loads the pure rule with the database module stubbed out.
import Module from "node:module";
const realLoad = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...a: unknown[]) => unknown })._load = function (request: string, ...rest: unknown[]) {
  if (request === "@/lib/db" || request.endsWith("/lib/db")) return { default: () => [] };
  if (request === "@vercel/blob") return { del: async () => {} };
  return realLoad.call(this, request, ...rest);
};

test("a company is confirmed on a domain only by a signed-in admin with a mailbox on it", async () => {
  const { adminsConfirmDomain } = await import("../lib/tapcardBiz");
  const confirmed = "2026-10-26T09:00:00Z";
  const own = [{ email: "owner@example-cafe.com", confirmed_at: confirmed }];
  assert.equal(adminsConfirmDomain(own, "example-cafe.com"), true);
  // An admin who has not opened their sign-in link yet proves nothing (anyone can type any address when signing up).
  assert.equal(adminsConfirmDomain([{ email: "owner@example-cafe.com", confirmed_at: null }], "example-cafe.com"), false);
  // Gmail sign-ups do not verify a business website.
  assert.equal(adminsConfirmDomain([{ email: "owner@gmail.com", confirmed_at: confirmed }], "example-cafe.com"), false);
  // Look-alike domains do not count, a subdomain does.
  assert.equal(adminsConfirmDomain([{ email: "x@notexample-cafe.com", confirmed_at: confirmed }], "example-cafe.com"), false);
  assert.equal(adminsConfirmDomain([{ email: "x@mail.example-cafe.com", confirmed_at: confirmed }], "example-cafe.com"), true);
  // One confirmed admin on the domain is enough, even with others who are not.
  assert.equal(adminsConfirmDomain([{ email: "a@gmail.com", confirmed_at: null }, ...own], "example-cafe.com"), true);
  assert.equal(adminsConfirmDomain(own, ""), false);
  assert.equal(adminsConfirmDomain([], "example-cafe.com"), false);
});
