import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHours, todayLine, weekText } from "../app/tapcard/demo/openingHours";

test("the demo reads opening hours like the apps: today's line and the whole week", () => {
  const week = parseHours("Tue to Thu: 1pm–3:30pm, 5pm–10pm; Fri and Sat: 1pm–3:30pm, 5pm–10:30pm; Sun: 1pm–3:30pm, 5pm–10pm")!;
  assert.equal(week.length, 3);
  assert.deepEqual([...week[0].days], [1, 2, 3]);
  assert.equal(week[1].label, "Fri & Sat");
  assert.equal(todayLine(week, 2), "Today (Wed) 1pm–3:30pm, 5pm–10pm");
  assert.equal(todayLine(week, 0), "Closed today (Mon)", "a day not listed is closed");
  assert.equal(weekText(week).split("\n").length, 3);
  const g = parseHours("Mon-Thu 11:30-15:00 / 17:30-22:30; Fri & Sat 11:30-22:30; Sun 11:30-22:00")!;
  assert.equal(g.length, 3);
  assert.equal(parseHours("Open whenever we feel like it"), null, "not clearly hours: shown as written");
  assert.equal(parseHours("Mon: Closed"), null);
});
