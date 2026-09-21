const KEY = "sbb-inbox-ack-v1";

type AckState = { dms: Record<string, string>; groups: Record<string, string> };

function empty(): AckState {
  return { dms: {}, groups: {} };
}

function load(): AckState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as AckState;
    return {
      dms: parsed.dms && typeof parsed.dms === "object" ? parsed.dms : {},
      groups: parsed.groups && typeof parsed.groups === "object" ? parsed.groups : {},
    };
  } catch {
    return empty();
  }
}

function save(state: AckState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function ackFriendDm(friendId: string, msgId: string) {
  const cur = load();
  cur.dms[friendId] = msgId;
  save(cur);
}

export function ackGroupThread(meetingId: string, msgId: string) {
  const cur = load();
  cur.groups[meetingId] = msgId;
  save(cur);
}

export function visibleFriendNotices(
  dms: { fromId: string; msgId: string; unread: number }[],
  openFriendId?: string,
) {
  const ack = load();
  let n = 0;
  for (const row of dms) {
    if (openFriendId && row.fromId === openFriendId) continue;
    if (ack.dms[row.fromId] === row.msgId) continue;
    n += row.unread;
  }
  return n;
}

export function visibleGroupNotices(
  groups: { meetingId: string; msgId: string; unread: number }[],
  openMeetingId?: string,
) {
  const ack = load();
  let n = 0;
  for (const row of groups) {
    if (openMeetingId && row.meetingId === openMeetingId) continue;
    if (ack.groups[row.meetingId] === row.msgId) continue;
    n += row.unread;
  }
  return n;
}
