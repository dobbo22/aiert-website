export function guestCountForName(name: string): number {
  return name.includes("&") ? 2 : 1;
}
