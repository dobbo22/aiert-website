import { test } from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql } from "./helpers/pgdb";
installStubs();

test("an alias lets a company on a second email domain verify, and only an alias added by hand does", async () => {
  const { domainAliases } = await import("../lib/tapcardDomainAliases");
  const { adminsConfirmDomain } = await import("../lib/tapcardBiz");
  const confirmed = "2026-11-12T09:00:00Z";
  const steve = [{ email: "steve@burgeandgunson.ltd.uk", confirmed_at: confirmed }];

  // Nothing listed: the .ltd.uk mailbox does not prove the .co.uk website.
  assert.deepEqual(await domainAliases("burgeandgunson.co.uk"), []);
  assert.equal(adminsConfirmDomain(steve, "burgeandgunson.co.uk"), false);

  // Added by hand, as Martin would after checking the company's own site shows that address.
  await domainAliases("x"); // makes sure the table exists
  await sql`INSERT INTO tapcard_domain_aliases (domain, alias, note) VALUES ('burgeandgunson.co.uk', 'burgeandgunson.ltd.uk', 'same company, site lists sales@burgeandgunson.ltd.uk')`;
  const aliases = await domainAliases("burgeandgunson.co.uk");
  assert.deepEqual(aliases, ["burgeandgunson.ltd.uk"]);
  assert.equal(adminsConfirmDomain(steve, ["burgeandgunson.co.uk", ...aliases]), true);

  // The alias is for that website only, and a look-alike domain or an unconfirmed admin still proves nothing.
  assert.deepEqual(await domainAliases("someoneelse.co.uk"), []);
  assert.equal(adminsConfirmDomain([{ email: "x@burgeandgunson-ltd.uk", confirmed_at: confirmed }], ["burgeandgunson.co.uk", ...aliases]), false);
  assert.equal(adminsConfirmDomain([{ email: "steve@burgeandgunson.ltd.uk", confirmed_at: null }], ["burgeandgunson.co.uk", ...aliases]), false);
});

test("free-mail and shared domains are never accepted as aliases, even if someone lists them", async () => {
  const { domainAliases } = await import("../lib/tapcardDomainAliases");
  await domainAliases("x");
  await sql`INSERT INTO tapcard_domain_aliases (domain, alias) VALUES ('example-shop.com', 'gmail.com'), ('example-shop.com', 'example-shop.net')`;
  assert.deepEqual(await domainAliases("example-shop.com"), ["example-shop.net"]);
});
