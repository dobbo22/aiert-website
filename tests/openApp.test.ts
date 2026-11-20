import test from "node:test";
import assert from "node:assert/strict";
import { openAppDestination, OPEN_APPS } from "../lib/tapcardOpenApp";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

test("each phone is sent to its own store page; others to the company website", () => {
  assert.equal(openAppDestination("chelsea", IPHONE), OPEN_APPS.chelsea.ios);
  assert.equal(openAppDestination("chelsea", ANDROID), OPEN_APPS.chelsea.android);
  assert.equal(openAppDestination("chelsea", DESKTOP), OPEN_APPS.chelsea.web);
  assert.equal(openAppDestination("CHELSEA", IPHONE), OPEN_APPS.chelsea.ios);
});

test("only listed companies redirect, and only to https addresses", () => {
  assert.equal(openAppDestination("anything-else", IPHONE), null);
  assert.equal(openAppDestination("../chelsea", IPHONE), null);
  for (const a of Object.values(OPEN_APPS)) for (const u of [a.ios, a.android, a.web]) assert.match(u, /^https:\/\//);
});
