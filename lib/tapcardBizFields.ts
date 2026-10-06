// TapCard for Business field lists with no server dependencies, so client
// components (the admin template form) can import them. lib/tapcardBiz.ts
// pulls in the database client, which throws in the browser for want of
// DATABASE_URL — importing these from there crashed the template page.

/// Every field a company can lock an employee out of editing. Rendered as
/// a single checklist on the admin template page — adding a new lockable
/// field later is a one-line change here, not new UI code.
export const LOCKABLE_FIELDS = [
  "title",
  "company",
  "phone",
  "website",
  "address",
  "linkedinURL",
  "twitterURL",
  "instagramURL",
  "facebookURL",
  "tiktokURL",
  "whatsAppURL",
] as const;

export const DEFAULT_LOCKED_FIELDS = [
  "company",
  "website",
  "linkedinURL",
  "twitterURL",
  "instagramURL",
  "facebookURL",
  "tiktokURL",
  "whatsAppURL",
];
