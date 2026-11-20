import { test } from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sqlMod = require("../lib/db") as { default: (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { domainLogoImage } = require("../lib/tapcardDomainLogos") as typeof import("../lib/tapcardDomainLogos");

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
const fakeFetch = ((url: string) => Promise.resolve(url.includes("good") ? new Response(png, { headers: { "content-type": "image/png" } }) : new Response("no", { status: 404 }))) as unknown as typeof fetch;

test("the logo set by hand for a domain is read, with or without www", async () => {
  await sqlMod.default`CREATE TABLE IF NOT EXISTS tapcard_domain_logos (domain TEXT PRIMARY KEY, url TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await sqlMod.default`INSERT INTO tapcard_domain_logos (domain, url) VALUES ('www.example-club.com', 'https://cdn.example/good.png'), ('bad-club.com', 'https://cdn.example/missing.png')`;
  const a = await domainLogoImage("example-club.com", fakeFetch);
  assert.equal(a?.contentType, "image/png");
  assert.equal(a?.bytes.length, png.length);
  assert.equal((await domainLogoImage("www.example-club.com", fakeFetch))?.contentType, "image/png");
  assert.equal(await domainLogoImage("bad-club.com", fakeFetch), null);
  assert.equal(await domainLogoImage("nothing.example", fakeFetch), null);
});
