// Minimal vCard (.vcf) reader for the TapCard Invites import — just the
// fields an invite needs. Runs in the browser: an iCloud export with contact
// photos is easily tens of MB, well past Vercel's request size limit, so
// only the extracted names/emails/numbers are sent to the server.

export type ImportedContact = {
  name: string;
  firstName: string;
  email: string;
  phone: string;
  company: string;
};

function unescapeValue(value: string): string {
  return value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

export function parseVcards(text: string): ImportedContact[] {
  // Unfold continuation lines (a line break followed by a space or tab).
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const contacts: ImportedContact[] = [];
  let current: { fn: string; given: string; family: string; emails: string[]; phones: { value: string; mobile: boolean }[]; org: string } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^BEGIN:VCARD$/i.test(line)) {
      current = { fn: "", given: "", family: "", emails: [], phones: [], org: "" };
      continue;
    }
    if (/^END:VCARD$/i.test(line)) {
      if (current) {
        const name = current.fn || [current.given, current.family].filter(Boolean).join(" ") || current.org;
        const phone = (current.phones.find((p) => p.mobile) ?? current.phones[0])?.value ?? "";
        const email = current.emails[0] ?? "";
        if (name && (email || phone)) {
          contacts.push({
            name,
            firstName: current.given || name.split(/\s+/)[0],
            email,
            phone,
            company: current.org,
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    // iCloud groups related lines as "item1.EMAIL;type=...:value".
    const key = line.slice(0, colon).replace(/^item\d+\./i, "");
    const value = line.slice(colon + 1);
    const [prop, ...params] = key.split(";");
    const paramText = params.join(";").toLowerCase();

    switch (prop.toUpperCase()) {
      case "FN":
        current.fn = unescapeValue(value);
        break;
      case "N": {
        const [family = "", given = ""] = value.split(";");
        current.family = unescapeValue(family);
        current.given = unescapeValue(given);
        break;
      }
      case "EMAIL":
        if (value.includes("@")) current.emails.push(unescapeValue(value));
        break;
      case "TEL":
        current.phones.push({ value: unescapeValue(value), mobile: /cell|mobile|iphone/.test(paramText) });
        break;
      case "ORG":
        current.org = unescapeValue(value.split(";")[0] ?? "");
        break;
    }
  }
  return contacts;
}
