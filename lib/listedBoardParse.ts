// Pure parts of the board check (no network, no database), so they can be tested on their own.
// A company's board is read from two public places: Companies House (the legal record of its directors) and the company's own website.
// A director is "confirmed" when both agree.
import { words } from "@/lib/listedSiteJudge";

export interface Person { display: string; first: string; last: string; key: string }
export interface Officer extends Person { role: string; appointedOn: string }
export interface ChCandidate { title: string; number: string; status: string; type: string; address: string }

const TITLES = /^(mr|mrs|ms|miss|dr|sir|dame|lord|lady|prof|professor|rt hon|the hon|hon)\.?$/i;
const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s'-]/g, " ").replace(/\s+/g, " ").trim();
const cap = (w: string) => w.toLowerCase().replace(/(^|[-'’ ])([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/\bMc([a-z])/g, (_, c) => "Mc" + c.toUpperCase());

/// Companies House gives "SURNAME, Forename Middle" (and "Sir"/"Dr" as titles). Returns the person as people say their name.
export function parseOfficerName(raw: string): Person {
  const [surname, rest = ""] = raw.split(",").map((x) => x.trim());
  const given = rest.split(/\s+/).filter((w) => w && !TITLES.test(w));
  const first = given[0] ?? "";
  const last = surname.replace(/\s+/g, " ");
  const display = [cap(first), cap(last)].filter(Boolean).join(" ");
  return { display, first: norm(first), last: norm(last), key: norm(`${first} ${last}`) };
}

/// Does the page text name this person? The surname must be there as a whole word, with the first name or its initial next to it.
export function namedOnPage(p: Person, text: string): boolean {
  if (!p.last) return false;
  const t = norm(text);
  const lastRe = p.last.split(" ").map((w) => w.replace(/[^a-z'-]/g, "")).filter(Boolean).join("\\s+");
  if (!lastRe) return false;
  const first = p.first.split(" ")[0] ?? "";
  const patterns = [
    first ? `\\b${first}\\b(?:\\s+[a-z'-]+){0,2}\\s+${lastRe}\\b` : "",
    first ? `\\b${lastRe}\\b\\s*,?\\s*\\b${first}\\b` : "",
    first ? `\\b${first[0]}\\.?\\s+${lastRe}\\b` : "",
  ].filter(Boolean);
  return patterns.some((re) => new RegExp(re).test(t));
}

/// Best Companies House match for a listed company's name: the same distinctive words, a company type that lists shares, and active.
/// A name that matches more than one company (a bank and its holding company) is left unmatched rather than guessed.
export function pickCompany(name: string, found: ChCandidate[]): { pick: ChCandidate | null; why: string } {
  const want = words(name).sort().join(" ");
  if (!want) return { pick: null, why: "the name has no distinctive words to search with" };
  const same = found.filter((c) => words(c.title).sort().join(" ") === want && /^(plc|ltd|private-limited-guarant-nsc-limited-exemption|oversea-company|registered-overseas-entity)$/i.test(c.type || "plc") !== false);
  const active = same.filter((c) => /^active$/i.test(c.status));
  const pool = active.length ? active : same;
  if (!pool.length) return { pick: null, why: found.length ? "no company on the register has this name" : "nothing came back from the register" };
  const plcs = pool.filter((c) => /^plc$/i.test(c.type));
  const final = plcs.length ? plcs : pool;
  if (final.length > 1) return { pick: null, why: `${final.length} companies share this name (${final.map((c) => c.number).join(", ")}): choose by hand` };
  return { pick: final[0], why: "" };
}

const ROLE = /\b(chair(man|woman|person)?|chief|ceo|cfo|coo|director|non-?executive|executive|secretary|president|senior independent|managing)\b/i;
const NOT_A_NAME = /\b(board|team|our|contact|committees?|governance|leadership|about|investors?|news|home|read|more|view|company|group|plc|limited|ltd|policy|report|results|careers?|menu|search|cookie|privacy|terms)\b/i;
const NAME = /^(?:(?:Dr|Mr|Mrs|Ms|Sir|Dame|Lord|Lady|Professor|Prof)\.? )?[A-Z][A-Za-z'’\-]+(?: [A-Z]\.?)?(?: (?:van|von|de|der|da|di|le|la|bin|al|el|mac|mc)?[ ]?[A-Z][A-Za-z'’\-]+){1,2}$/;

/// Names of people on a board page, for people Companies House does not list (or to compare when Companies House cannot be reached):
/// a line that looks like a person's name, with a role word on the same or the next line. A guess, shown as such.
export function extractWebsiteNames(html: string): { name: string; role: string }[] {
  const text = html
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|td|section|article|figcaption|span|a|strong|b)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: { name: string; role: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < text.length; i++) {
    const line = text[i];
    if (line.length < 5 || line.length > 45 || !NAME.test(line) || ROLE.test(line) || NOT_A_NAME.test(line)) continue;
    const next = text[i + 1] ?? "";
    const prev = text[i - 1] ?? "";
    const sane = (r: string) => ROLE.test(r) && r.length < 70 && !/^\(/.test(r) && !/,\s*[A-Z][a-z]+ [A-Z][a-z]+/.test(r) && !/\band all other\b/i.test(r);
    const role = sane(next) ? next : sane(prev) ? prev : "";
    if (!role) continue;
    const key = norm(line);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: line, role });
  }
  return out.slice(0, 30);
}

export const BOARD_LINK_TEXT = /^(the )?(board|board of directors|our board|directors|board (&|and) committees|board members|leadership|leadership team|our leadership|management|management team|our team|our people|team|who we are|meet the team|governance)$/i;
export const BOARD_PATH = /\/(board(-of-directors)?|directors|leadership(-team)?|management(-team)?|our-team|our-people|team|meet-the-team|governance\/board|board-members)\/?$/i;
export const COMMON_BOARD_PATHS = ["/board", "/board-of-directors", "/about/board", "/about-us/board", "/about/board-of-directors", "/about-us/board-of-directors", "/investors/board-of-directors", "/investors/governance/board", "/about/leadership", "/about-us/leadership", "/about/our-team", "/about-us/our-team", "/directors"];

/// Words the register search is more likely to find: abbreviations written out ("Hldgs" -> "Holdings").
export function searchNames(name: string): string[] {
  const expand = (n: string) => n.replace(/\bhldgs?\b/gi, "Holdings").replace(/\bgrp\b/gi, "Group").replace(/\bintl\b/gi, "International").replace(/\binv(s|t)?\b/gi, "Investment").replace(/\btst\b/gi, "Trust");
  const strip = (n: string) => n.replace(/\b(plc|ltd|limited)\b\.?/gi, " ").replace(/\s+/g, " ").trim();
  const core = words(name).join(" ");
  return [...new Set([strip(expand(name)), core, strip(name), name].filter((q) => q.length >= 3))];
}
