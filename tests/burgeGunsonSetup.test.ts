import { test, before } from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql } from "./helpers/pgdb";
installStubs();

before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

// A rehearsal of how Burge & Gunson is set up: AIERT's Companies page "Create" (createManagedCompany) with 2 locations and Steve's address,
// then Steve confirming his sign-in, with the .ltd.uk email alias for their .co.uk website. Nothing is charged at any point.
test("a managed company for 2 locations is free, active and has room for 22 cards, with no renewal date", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { getOrg, isComplimentary, isOrgActive, orgCanProvision } = await import("../lib/tapcardBiz");
  const created = await createManagedCompany({ name: "Burge & Gunson", adminEmail: "Steve@BurgeAndGunson.ltd.uk", locations: 2 });
  const org = (await getOrg(created.id))!;
  assert.equal(org.billing_status, "active");
  assert.equal(org.seat_band, "locations", "a location plan, not a one-card trial (a trial may only add one location)");
  assert.equal(org.locations, 2);
  assert.equal(org.seat_limit, 22, "2 locations x (1 location card + 10 staff cards)");
  assert.equal(org.current_period_end, null, "no renewal date, no Stripe subscription: nothing is charged");
  assert.equal(org.stripe_subscription_id ?? null, null);
  assert.equal(isOrgActive(org), true);
  assert.equal(isComplimentary(org), true);
  assert.equal(orgCanProvision(org), true, "locations, invites and staff cards are all allowed");
});

test("Steve's @burgeandgunson.ltd.uk sign-in proves the company owns burgeandgunson.co.uk, but only with the alias and only once he has signed in", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { confirmAdminEmail, orgHasConfirmedAdminOnDomain } = await import("../lib/tapcardBiz");
  const org = await createManagedCompany({ name: "Burge & Gunson Verify", adminEmail: "steve@burgeandgunson.ltd.uk", locations: 2 });
  // Not signed in yet: added by AIERT, but nobody has opened the sign-in link, so nothing is proven.
  assert.equal(await orgHasConfirmedAdminOnDomain(org.id, "burgeandgunson.co.uk"), false);
  await confirmAdminEmail(org.id, "steve@burgeandgunson.ltd.uk");
  // Signed in, but the website is .co.uk and the mailbox is .ltd.uk, so without the alias it still fails.
  await sql`DELETE FROM tapcard_domain_aliases WHERE domain = 'burgeandgunson.co.uk'`.catch(() => {});
  assert.equal(await orgHasConfirmedAdminOnDomain(org.id, "burgeandgunson.co.uk"), false, "no alias yet");
  await sql`INSERT INTO tapcard_domain_aliases (domain, alias, note) VALUES ('burgeandgunson.co.uk', 'burgeandgunson.ltd.uk', 'same company')`;
  assert.equal(await orgHasConfirmedAdminOnDomain(org.id, "burgeandgunson.co.uk"), true, "with the alias, the confirmed .ltd.uk admin proves the .co.uk website");
  // A stranger's company with a look-alike admin address still gets nothing.
  const other = await createManagedCompany({ name: "Look-alike Co", adminEmail: "x@burgeandgunson-ltd.uk", locations: 1 });
  await confirmAdminEmail(other.id, "x@burgeandgunson-ltd.uk");
  assert.equal(await orgHasConfirmedAdminOnDomain(other.id, "burgeandgunson.co.uk"), false);
});

test("after the free months: setting a renewal date shows the upgrade option without stopping anything; cancelling the status stops new setup only", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { getOrg, isComplimentary, isOrgActive, orgCanProvision } = await import("../lib/tapcardBiz");
  const created = await createManagedCompany({ name: "Burge & Gunson Later", adminEmail: "steve@later.example", locations: 2 });
  await sql`UPDATE tapcard_biz_orgs SET current_period_end = now() + interval '30 days' WHERE id = ${created.id}`;
  let org = (await getOrg(created.id))!;
  assert.equal(isComplimentary(org), false, "the billing page now offers the Stripe upgrade instead of 'nothing to pay'");
  assert.equal(isOrgActive(org), true, "and nothing stops while he decides");
  await sql`UPDATE tapcard_biz_orgs SET billing_status = 'canceled' WHERE id = ${created.id}`;
  org = (await getOrg(created.id))!;
  assert.equal(isOrgActive(org), false);
  assert.equal(orgCanProvision(org), false, "new locations, invites and staff cards pause (existing cards keep working)");
});
