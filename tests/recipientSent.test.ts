import { test } from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

test("a card only counts as sent when the app says the share sheet really sent it; a dismissed one is removed", async () => {
  const { addCardRecipient, reportRecipientSend, listNotifiableRecipients, listRecipients } = await import("../lib/tapcardDb");
  const card = "recipient-sent-1";

  // An older app never reports, so its rows behave exactly as before (counted and emailed).
  const old = await addCardRecipient(card, "Old App Person", "", "old@example.com");
  assert.ok((await listNotifiableRecipients(card)).some((r) => r.id === old.id), "legacy row still notifiable");

  // A newer app registers before the sheet opens, and reports afterwards.
  const a = await addCardRecipient(card, "Sent Person", "", "sent@example.com", true);
  const b = await addCardRecipient(card, "Dismissed Person", "", "dismissed@example.com", true);
  const notifiable = async () => (await listNotifiableRecipients(card)).map((r) => r.email);
  assert.ok(!(await notifiable()).includes("sent@example.com"), "not emailed about changes until it is really sent");

  await reportRecipientSend(card, Number(a.id), true);
  await reportRecipientSend(card, Number(b.id), false);
  assert.ok((await notifiable()).includes("sent@example.com"), "sent: now counted");
  assert.ok(!(await listRecipients(card)).some((r) => r.email === "dismissed@example.com"), "dismissed and never sent: removed");

  // A later dismissal never removes a card that already went once.
  await reportRecipientSend(card, Number(a.id), false);
  const list = await listRecipients(card);
  const sent = list.find((r) => r.email === "sent@example.com");
  assert.ok(sent && sent.sent_at, "kept, with its sent time");

  // One card's report cannot touch another card's recipient.
  await reportRecipientSend("some-other-card", Number(old.id), false);
  assert.ok((await listRecipients(card)).some((r) => r.email === "old@example.com"));
});
