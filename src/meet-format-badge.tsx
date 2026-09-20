import { meetingFormatLabel } from "@/meeting-format";

export function MeetFormatBadge({ isOnline }: { isOnline: boolean }) {
  return (
    <span className={`badge format-${isOnline ? "online" : "offline"}`}>{meetingFormatLabel(isOnline)}</span>
  );
}
