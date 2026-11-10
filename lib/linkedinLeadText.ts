// Plain helpers for the warm-leads list. Kept apart from lib/linkedinEngagement.ts (database + LinkedIn calls) so the browser
// component can import them without pulling server-only code into the page.

export function profileUrl(l: { vanity: string; person_id: string }): string {
  return l.vanity ? `https://www.linkedin.com/in/${l.vanity}/` : "";
}

// A short, honest connection note (LinkedIn allows about 200 characters on a free invite). Never claims more than "thanks for engaging".
export function connectNote(name: string, actions: string): string {
  const first = name.trim().split(/\s+/)[0];
  const hi = first ? `Hi ${first}, thanks` : "Hi, thanks";
  const what = actions.includes("comment") ? "for commenting on" : "for the reaction to";
  return `${hi} ${what} our TapCard post. I'm building TapCard, a digital card that lets small businesses send offers to their followers' phones. Good to connect. Martin`.slice(0, 300);
}
