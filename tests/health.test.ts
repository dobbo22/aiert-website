import test from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

test("health check answers 200 ok with no data and no caching when the database answers", async () => {
  const { GET } = await import("../app/api/tapcard/health/route");
  const res = await GET();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.match(res.headers.get("cache-control") ?? "", /no-store/);
});
