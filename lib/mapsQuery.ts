// What Apple Maps is asked for when a card's address is opened. The address alone makes Apple drop a pin on the street number, and it can
// be a neighbour (it listed the Prince Alfred at "5 Formosa Street" and put "5A" on the next shopfront). With the business name and the
// street WITHOUT the house number, Apple finds the place itself.
export function appleMapsQuery(address: string, place = ""): string {
  const a = address.trim(), p = place.trim();
  if (!p || !a) return a;
  const street = a.replace(/^\s*(?:(?:flat|unit|suite)\s+\w+[,\s]+)?\d+[A-Za-z]?(?:\s*[-\/]\s*\d+[A-Za-z]?)?\s*,?\s+(?=[A-Za-z])/i, "");
  return a.toLowerCase().includes(p.toLowerCase()) ? street : `${p}, ${street}`;
}
