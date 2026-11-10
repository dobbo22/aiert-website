// LinkedIn engagement tracker: who reacted to or commented on the AIERT LTD page's posts, and when the page was mentioned.
// People are warm leads: they are listed with their name, headline and profile link so Martin can connect with a personal note.
// Nothing is ever sent from here (LinkedIn's API has no connection requests or messages for us); this only reads and stores.
// Development Tier allows 100 LinkedIn calls a day per member, so one daily cron scans the last 30 days of posts (at most 10).
import sql from "@/lib/db";
import { connectNote, profileUrl } from "./linkedinLeadText";
export { connectNote, profileUrl };
import { listLinkedInPosts, listLinkedInComments, linkedinGet, orgUrn } from "./linkedinApi";

export type LeadStatus = "new" | "contacted" | "ignore";
export type Lead = {
  person_id: string; name: string; headline: string; vanity: string; status: LeadStatus; score: number;
  actions: string; last_at: string; last_detail: string; note: string;
};
export type Mention = { notification_id: string; action: string; source_post: string; occurred_at: string };

let ready: Promise<unknown> | null = null;
function ensureTables() {
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS linkedin_people (
      person_id text PRIMARY KEY, name text NOT NULL DEFAULT '', headline text NOT NULL DEFAULT '', vanity text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'new', note text NOT NULL DEFAULT '', resolved boolean NOT NULL DEFAULT false, first_seen timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS linkedin_engagement (
      event_key text PRIMARY KEY, person_id text NOT NULL, kind text NOT NULL, post_urn text NOT NULL, detail text NOT NULL DEFAULT '', occurred_at timestamptz NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS linkedin_mentions (
      notification_id text PRIMARY KEY, action text NOT NULL, source_post text NOT NULL, occurred_at timestamptz NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS linkedin_engagement_scans (id serial PRIMARY KEY, ran_at timestamptz NOT NULL DEFAULT now(), found int NOT NULL DEFAULT 0)`;
  })();
  return ready;
}

// ---- Pure helpers (tested) ----
export const personIdOf = (urn: string): string | null => (urn.startsWith("urn:li:person:") ? urn.slice("urn:li:person:".length) : null);

export function parseReactions(json: unknown, postUrn: string): { personId: string; kind: string; at: string; key: string }[] {
  const els = (json as { elements?: { reactionType?: string; created?: { actor?: string; time?: number } }[] })?.elements ?? [];
  const out: { personId: string; kind: string; at: string; key: string }[] = [];
  for (const e of els) {
    const id = personIdOf(e.created?.actor ?? "");
    if (!id) continue;
    out.push({ personId: id, kind: `reaction:${e.reactionType ?? "LIKE"}`, at: new Date(e.created?.time ?? Date.now()).toISOString(), key: `r:${postUrn}:${id}` });
  }
  return out;
}

export function parsePeople(json: unknown): Map<string, { name: string; headline: string; vanity: string }> {
  const res = (json as { results?: Record<string, { localizedFirstName?: string; localizedLastName?: string; localizedHeadline?: string; vanityName?: string }> })?.results ?? {};
  const out = new Map<string, { name: string; headline: string; vanity: string }>();
  for (const [k, v] of Object.entries(res)) {
    const id = /^\(id:(.+)\)$/.exec(k)?.[1];
    if (!id || !v) continue;
    out.set(id, { name: [v.localizedFirstName, v.localizedLastName].filter(Boolean).join(" "), headline: v.localizedHeadline ?? "", vanity: v.vanityName ?? "" });
  }
  return out;
}

export const scoreOf = (kinds: string[]) => kinds.reduce((n, k) => n + (k === "comment" ? 3 : 1), 0);

// ---- Scan ----
const MAX_POSTS = 10;
const WINDOW_MS = 30 * 86_400_000;

export async function scanEngagement(): Promise<{ posts: number; events: number; newPeople: number; mentions: number }> {
  await ensureTables();
  const me = process.env.LINKEDIN_PERSON_URN ?? "";
  const mePerson = personIdOf(me);
  const posts = (await listLinkedInPosts(15)).filter((p) => Date.now() - new Date(p.createdAt).getTime() < WINDOW_MS).slice(0, MAX_POSTS);
  const found: { personId: string; kind: string; at: string; key: string; post: string; detail: string }[] = [];
  for (const p of posts) {
    try {
      const r = await linkedinGet(`reactions/(entity:${encodeURIComponent(p.urn)})?q=entity&count=50`);
      for (const e of parseReactions(r, p.urn)) found.push({ ...e, post: p.urn, detail: e.kind.replace("reaction:", "").toLowerCase() });
    } catch { /* one post failing never stops the scan */ }
    try {
      for (const c of await listLinkedInComments(p.urn)) {
        const id = personIdOf(c.actor);
        if (id) found.push({ personId: id, kind: "comment", at: c.createdAt, key: `c:${c.id || c.commentUrn}`, post: p.urn, detail: c.text.slice(0, 300) });
      }
    } catch { /* ignore */ }
  }
  const events = found.filter((e) => e.personId !== mePerson);
  let newPeople = 0;
  const unseen: string[] = [];
  for (const id of new Set(events.map((e) => e.personId))) {
    const row = (await sql`INSERT INTO linkedin_people (person_id) VALUES (${id}) ON CONFLICT DO NOTHING RETURNING person_id`) as unknown[];
    if (row.length) newPeople++;
  }
  for (const e of events) {
    await sql`INSERT INTO linkedin_engagement (event_key, person_id, kind, post_urn, detail, occurred_at) VALUES (${e.key}, ${e.personId}, ${e.kind}, ${e.post}, ${e.detail}, ${e.at}) ON CONFLICT (event_key) DO UPDATE SET detail = EXCLUDED.detail`;
  }
  const todo = (await sql`SELECT person_id FROM linkedin_people WHERE resolved = false LIMIT 40`) as { person_id: string }[];
  unseen.push(...todo.map((t) => t.person_id));
  for (let i = 0; i < unseen.length; i += 20) {
    const batch = unseen.slice(i, i + 20);
    try {
      const info = parsePeople(await linkedinGet(`people?ids=List(${batch.map((b) => `(id:${b})`).join(",")})`));
      for (const id of batch) {
        const v = info.get(id);
        if (v) await sql`UPDATE linkedin_people SET name = ${v.name}, headline = ${v.headline}, vanity = ${v.vanity}, resolved = true WHERE person_id = ${id}`;
      }
    } catch { /* names are a nice-to-have; try again next scan */ }
  }
  // Mentions of the page: the notifications feed says someone mentioned us, but LinkedIn does not let us read who (the post is private to us).
  let mentions = 0;
  try {
    const n = (await linkedinGet(`organizationalEntityNotifications?q=criteria&actions=List(SHARE_MENTION)&organizationalEntity=${encodeURIComponent(orgUrn())}&count=50`)) as {
      elements?: { action: string; notificationId: number | string; sourcePost?: string; lastModifiedAt?: number }[];
    };
    for (const e of n.elements ?? []) {
      const r = (await sql`INSERT INTO linkedin_mentions (notification_id, action, source_post, occurred_at) VALUES (${String(e.notificationId)}, ${e.action}, ${e.sourcePost ?? ""}, ${new Date(e.lastModifiedAt ?? Date.now()).toISOString()}) ON CONFLICT DO NOTHING RETURNING notification_id`) as unknown[];
      mentions += r.length;
    }
  } catch { /* ignore */ }
  await sql`INSERT INTO linkedin_engagement_scans (found) VALUES (${events.length})`;
  return { posts: posts.length, events: events.length, newPeople, mentions };
}

// ---- Reads and edits for the admin page ----
export async function listLeads(): Promise<Lead[]> {
  await ensureTables();
  const rows = (await sql`
    SELECT p.person_id, p.name, p.headline, p.vanity, p.status, p.note,
      array_agg(e.kind ORDER BY e.occurred_at DESC) AS kinds, MAX(e.occurred_at) AS last_at,
      (array_agg(e.detail ORDER BY e.occurred_at DESC))[1] AS last_detail
    FROM linkedin_people p JOIN linkedin_engagement e ON e.person_id = p.person_id
    GROUP BY p.person_id ORDER BY MAX(e.occurred_at) DESC LIMIT 200`) as { person_id: string; name: string; headline: string; vanity: string; status: LeadStatus; note: string; kinds: string[]; last_at: string; last_detail: string }[];
  return rows.map((r) => ({
    person_id: r.person_id, name: r.name, headline: r.headline, vanity: r.vanity, status: r.status, note: r.note,
    score: scoreOf(r.kinds), last_at: new Date(r.last_at).toISOString(), last_detail: r.last_detail,
    actions: [...new Set(r.kinds.map((k) => (k === "comment" ? "commented" : "reacted")))].join(" + "),
  })).sort((a, b) => (a.status === "new" ? 0 : 1) - (b.status === "new" ? 0 : 1) || b.score - a.score || b.last_at.localeCompare(a.last_at));
}

export async function listMentions(): Promise<Mention[]> {
  await ensureTables();
  return (await sql`SELECT notification_id, action, source_post, occurred_at FROM linkedin_mentions ORDER BY occurred_at DESC LIMIT 20`) as Mention[];
}

export async function lastScanAt(): Promise<string | null> {
  await ensureTables();
  const r = (await sql`SELECT ran_at FROM linkedin_engagement_scans ORDER BY ran_at DESC LIMIT 1`) as { ran_at: string }[];
  return r[0] ? new Date(r[0].ran_at).toISOString() : null;
}

export async function setLeadStatus(personId: string, status: string): Promise<void> {
  if (!["new", "contacted", "ignore"].includes(status)) throw new Error("Unknown status");
  await ensureTables();
  await sql`UPDATE linkedin_people SET status = ${status} WHERE person_id = ${personId}`;
}
