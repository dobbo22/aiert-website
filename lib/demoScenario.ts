// The made-up IPO story for the demo company (Example Resources plc). Plain data: change the wording, firms or times here and the demo
// follows. Nothing here is real: every firm, person and address is invented (addresses end in .example, a name reserved so it can never be real). The firm's address spells its name, because the Followers tab works the company name out from it.

export const COMPANY = "Example Resources plc";

/** Headlines are saved as the company's latest announcement and pushed to followers. Each is under 140 characters. */
export const HEADLINES = {
  broker: "Example Resources plc (demo): Appoints Cavendish as broker ahead of a planned IPO. Read the announcement on our website.",
  ipo: "Example Resources plc (demo): Announces plans for a £100m IPO. Read the announcement on our website.",
  raise: "Example Resources plc (demo): Listing complete and £100m raised. Shares now trading. Read the announcement on our website.",
};
export const STORY_LINK = "https://tapcard.aiert.co.uk/investors";

export const ROADSHOW_LABEL = "IPO roadshow";
/** Five meetings a day for two days: each is a slot of the event, one investment house per slot (local time). */
export const MEETING_TIMES: [string, string][] = [["09:00", "10:00"], ["10:30", "11:30"], ["12:00", "13:00"], ["14:00", "15:00"], ["15:30", "16:30"]];

export interface Manager { name: string; title: string }
export interface Firm { name: string; domain: string; managers: Manager[] }

/** Ten made-up investment houses, in meeting order (first five on day 1, last five on day 2). */
export const FIRMS: Firm[] = [
  { name: "Northgate Asset Management", domain: "northgate-asset-management.example", managers: [{ name: "Priya Shah", title: "Fund Manager" }, { name: "Tom Hallett", title: "Portfolio Manager" }, { name: "Grace Whitlow", title: "Head of Equities" }] },
  { name: "Thornbury Capital", domain: "thornbury-capital.example", managers: [{ name: "Liam Ferris", title: "Investment Director" }, { name: "Aisha Rahman", title: "Fund Manager" }, { name: "Paul Denholm", title: "Analyst" }] },
  { name: "Pemberton & Hale", domain: "pemberton-hale.example", managers: [{ name: "Emma Cartwright", title: "Portfolio Manager" }, { name: "Ravi Menon", title: "Fund Manager" }, { name: "Chris Aldous", title: "Head of Research" }] },
  { name: "Ashdown Investment Partners", domain: "ashdown-investment-partners.example", managers: [{ name: "Hannah Brooke", title: "Fund Manager" }, { name: "Omar Siddiqui", title: "Investment Director" }, { name: "Zoe Marchant", title: "Analyst" }] },
  { name: "Lyndhurst Fund Managers", domain: "lyndhurst-fund-managers.example", managers: [{ name: "Ben Overton", title: "Portfolio Manager" }, { name: "Mei Tan", title: "Fund Manager" }, { name: "Jack Pryor", title: "Head of Equities" }] },
  { name: "Harcourt Wealth", domain: "harcourt-wealth.example", managers: [{ name: "Nina Castellan", title: "Investment Director" }, { name: "Leo Banister", title: "Fund Manager" }, { name: "Sam Okafor", title: "Portfolio Manager" }] },
  { name: "Redfern Asset Management", domain: "redfern-asset-management.example", managers: [{ name: "Alex Whitby", title: "Fund Manager" }, { name: "Fatima Noor", title: "Head of Research" }, { name: "Dan Kerrigan", title: "Analyst" }] },
  { name: "Calloway Capital", domain: "calloway-capital.example", managers: [{ name: "Sophie Lindqvist", title: "Portfolio Manager" }, { name: "Marcus Bell", title: "Fund Manager" }, { name: "Rhea Kapoor", title: "Investment Director" }] },
  { name: "Sterling Bridge Partners", domain: "sterling-bridge-partners.example", managers: [{ name: "Oliver Sandes", title: "Head of Equities" }, { name: "Chloe Rennick", title: "Fund Manager" }, { name: "Yusuf Demir", title: "Analyst" }] },
  { name: "Marlowe Investment Trust", domain: "marlowe-investment-trust.example", managers: [{ name: "Isla Gerrard", title: "Fund Manager" }, { name: "Hugo Ashby", title: "Portfolio Manager" }, { name: "Tara Quinlan", title: "Investment Director" }] },
];

/** How many people turn up to a meeting: a random whole number from here to here. */
export const ATTENDEES: [number, number] = [3, 9];
/** How many of them are fund managers who choose to share their name and email (at most this many, at least one). */
export const MAX_SHARERS = 3;

/** The extra people who follow after reading the listing and raise announcement, and the taps on it. */
export const AFTER_LISTING = { taps: 20, followers: 30 };

/** Seconds between the meetings of one day when it runs (each firm's count jumps in turn; a whole day takes about three seconds). */
export const MEETING_DELAY_SECONDS = 0.6;
