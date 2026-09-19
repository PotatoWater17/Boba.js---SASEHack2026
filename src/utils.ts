/** Client-safe helpers shared by server and browser code. */

export function initials(first: string, last: string) {
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "?";
}
