export type InboxDm = {
  fromId: string;
  msgId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  preview: string;
  unread: number;
  createdAt: string;
};

export type InboxGroup = {
  meetingId: string;
  msgId: string;
  subject: string;
  fromId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  preview: string;
  unread: number;
  createdAt: string;
};

export type InboxDmReact = {
  noticeId: string;
  actorId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  emoji: string;
  preview: string;
  unread: number;
};

export type InboxGroupReact = {
  noticeId: string;
  meetingId: string;
  subject: string;
  actorId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  emoji: string;
  preview: string;
  unread: number;
};

export type InboxBuddyRequest = {
  fromId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  createdAt: string;
};

export type InboxMeetupInvite = {
  inviteId: string;
  meetingId: string;
  subject: string;
  fromId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  createdAt: string;
};

export type InboxJoinRequest = {
  requestId: string;
  meetingId: string;
  subject: string;
  fromId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  createdAt: string;
};

export type InboxGroupActivity = {
  noticeId: string;
  kind: "leave" | "kicked" | "disbanded";
  meetingId: string;
  subject: string;
  actorId: string;
  actorName: string;
  actorPhoto: string;
  createdAt: string;
};

export type InboxPayload = {
  dms: InboxDm[];
  groups: InboxGroup[];
  dmReacts: InboxDmReact[];
  groupReacts: InboxGroupReact[];
  buddyRequests: InboxBuddyRequest[];
  meetupInvites: InboxMeetupInvite[];
  joinRequests: InboxJoinRequest[];
  groupActivity: InboxGroupActivity[];
  friendNotices: number;
  groupNotices: number;
  activityCount: number;
};

export const emptyInbox = (): InboxPayload => ({
  dms: [],
  groups: [],
  dmReacts: [],
  groupReacts: [],
  buddyRequests: [],
  meetupInvites: [],
  joinRequests: [],
  groupActivity: [],
  friendNotices: 0,
  groupNotices: 0,
  activityCount: 0,
});
