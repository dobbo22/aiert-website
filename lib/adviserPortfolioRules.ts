// The pure rules for the adviser's portfolio view (search, filter, sort, totals). No database code, so the portal's client components can use them.

export interface PortfolioRow {
  orgId: string; name: string; status: string; canRegulatory: boolean; coverStatus: string; tierLabel: string; monthlyPence: number;
  followers: number; committedUntil: string | null; coverEndsAt: string | null; lastHeadline: string | null; lastHeadlineAt: string | null; waitingForYou: number; yourDrafts: number; noPage: boolean;
}
export type PortfolioFilter = "all" | "attention" | "paying" | "waiting";

export const needsAttention = (r: PortfolioRow) => r.status === "approved" && (r.waitingForYou > 0 || r.noPage);
export const isPaying = (r: PortfolioRow) => r.coverStatus === "active" || r.coverStatus === "ending";

export function filterRows(rows: PortfolioRow[], query: string, filter: PortfolioFilter): PortfolioRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (filter === "attention") return needsAttention(r);
    if (filter === "paying") return isPaying(r);
    if (filter === "waiting") return r.status === "pending";
    return true;
  });
}

/// Companies that need doing something first, then the ones you can work in, then the ones still waiting for the company, each by name.
export function sortRows(rows: PortfolioRow[]): PortfolioRow[] {
  const rank = (r: PortfolioRow) => (needsAttention(r) ? 0 : r.status === "approved" ? 1 : r.status === "pending" ? 2 : 3);
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function portfolioTotals(rows: PortfolioRow[]) {
  const approved = rows.filter((r) => r.status === "approved");
  return {
    companies: approved.length, pending: rows.filter((r) => r.status === "pending").length, attention: rows.filter(needsAttention).length,
    waitingForYou: rows.reduce((n, r) => n + r.waitingForYou, 0), followers: approved.reduce((n, r) => n + r.followers, 0), monthlyPence: rows.reduce((n, r) => n + (isPaying(r) ? r.monthlyPence : 0), 0),
  };
}

