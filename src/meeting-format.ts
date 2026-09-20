/** Client-safe meeting format helpers (online vs in person). */

export const MEETING_FORMAT_FILTERS = [
  { value: "online", label: "Online" },
  { value: "offline", label: "In person" },
] as const;

export type MeetingFormatFilter = (typeof MEETING_FORMAT_FILTERS)[number]["value"];

export function meetingFormatLabel(isOnline: boolean) {
  return isOnline ? "Online" : "In person";
}

/** Best-effort guess for legacy rows before isOnline existed. */
export function inferMeetingOnline(location: string) {
  const l = location.trim().toLowerCase();
  if (!l) return false;
  return /\b(online|zoom|teams|discord|virtual|remote|meet\.google|google meet|webex|facetime)\b/.test(l);
}

export function parseMeetingFormatFilter(raw: string | undefined): MeetingFormatFilter | "" {
  if (raw === "online" || raw === "offline") return raw;
  return "";
}
