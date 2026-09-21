/** Client-safe helpers shared by server and browser code. */

export function initials(first: string, last: string) {
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "?";
}

export function timeAgo(date: Date | string) {
  const t = typeof date === "string" ? new Date(date) : date;
  const min = Math.max(0, Math.floor((Date.now() - t.getTime()) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week === 1 ? "" : "s"} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month === 1 ? "" : "s"} ago`;
  const year = Math.max(1, Math.floor(day / 365));
  return `${year} year${year === 1 ? "" : "s"} ago`;
}
