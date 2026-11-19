// The roles the investor-relations manual is written for. Kept free of database code so tests and pure helpers can use it.
export const GUIDE_ROLES = ["company-senior", "company-general", "adviser-senior", "adviser-general", "shareholder"] as const;
export type GuideRole = (typeof GUIDE_ROLES)[number];
export const isGuideRole = (v: unknown): v is GuideRole => typeof v === "string" && (GUIDE_ROLES as readonly string[]).includes(v);
