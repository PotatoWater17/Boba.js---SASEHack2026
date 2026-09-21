export function visibleFriendNotices(
  dms: { fromId: string; msgId: string; unread: number }[],
  openFriendId?: string,
) {
  let n = 0;
  for (const row of dms) {
    if (openFriendId && row.fromId === openFriendId) continue;
    n += row.unread;
  }
  return n;
}

export function visibleGroupNotices(
  groups: { meetingId: string; msgId: string; unread: number }[],
  openMeetingId?: string,
) {
  let n = 0;
  for (const row of groups) {
    if (openMeetingId && row.meetingId === openMeetingId) continue;
    n += row.unread;
  }
  return n;
}
