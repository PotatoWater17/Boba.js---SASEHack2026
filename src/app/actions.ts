"use server";

import { redirect } from "next/navigation";
import { groupKindById, MEETUP_STYLES, resolveCourse } from "@/courses";
import { nextAccountNo } from "@/account-id";
import { getAdmin } from "@/admin";
import { removeAttach, saveAttach, saveAvatar, removeAvatar } from "@/files";
import { resolveUniversity } from "@/universities";
import { resolveMajor } from "@/majors";
import { purgeMeeting, removeMeetingIfEmpty } from "@/meeting-cleanup";
import { addMeetingMemberIfRoom } from "@/meeting-members";
import { clientIp, rateLimit } from "@/rate-limit";
import {
  blockedByMe,
  blockedUserIds,
  clearUser,
  formatTimeInput,
  getMe,
  hashPassword,
  isBlockedBetween,
  isStrongPassword,
  isValidMeetDate,
  needsPasswordUpgrade,
  parseDateField,
  prisma,
  safeNextPath,
  setUser,
  splitList,
  verifyPassword,
} from "@/lib";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const university = resolveUniversity(String(formData.get("university") || ""));

  if (!email || !password || !firstName || !lastName || !university) {
    redirect("/signup?error=fill");
  }
  if (password !== confirm) redirect("/signup?error=match");
  if (!isStrongPassword(password)) redirect("/signup?error=weak");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) redirect("/login?notice=signup");

  const accountNo = await nextAccountNo();
  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      firstName,
      lastName,
      university,
      accountNo,
    },
  });

  await setUser(user.id, user.sessionVersion);
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  const ip = await clientIp();
  const ipLimit = rateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
  if (!ipLimit.ok) redirect("/login?error=rate");
  if (email) {
    const emailLimit = rateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
    if (!emailLimit.ok) redirect("/login?error=rate");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.password)) {
    redirect("/login?error=bad");
  }

  if (needsPasswordUpgrade(user.password)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashPassword(password) },
    });
  }

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  await setUser(user.id, fresh?.sessionVersion ?? 0);
  redirect("/dashboard");
}

export async function logout() {
  await clearUser();
  redirect("/");
}

export async function changePassword(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  if (!current || !next || !confirm) redirect(`/profile/${me.id}?edit=1&error=pwfill`);
  if (!verifyPassword(current, me.password)) redirect(`/profile/${me.id}?edit=1&error=pwbad`);
  if (next !== confirm) redirect(`/profile/${me.id}?edit=1&error=pwmatch`);
  if (!isStrongPassword(next)) redirect(`/profile/${me.id}?edit=1&error=pwweak`);

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: { password: hashPassword(next), sessionVersion: { increment: 1 } },
  });

  await setUser(updated.id, updated.sessionVersion);
  redirect(`/profile/${me.id}?edit=1&pw=changed`);
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const note = String(formData.get("note") || "")
    .trim()
    .slice(0, 300);

  if (!email) redirect("/forgot-password?error=fill");

  const ip = await clientIp();
  const ipLimit = rateLimit(`reset:ip:${ip}`, 8, 60 * 60 * 1000);
  if (!ipLimit.ok) redirect("/forgot-password?error=rate");
  const emailLimit = rateLimit(`reset:email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.ok) redirect("/forgot-password?error=rate");

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const existing = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id, status: "pending" },
    });
    if (existing) {
      if (note && note !== existing.note) {
        await prisma.passwordResetRequest.update({
          where: { id: existing.id },
          data: { note },
        });
      }
    } else {
      await prisma.passwordResetRequest.create({
        data: { userId: user.id, note },
      });
    }
  }

  redirect("/forgot-password?sent=1");
}

export async function adminResetPassword(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/dashboard");

  const requestId = String(formData.get("requestId") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  if (!requestId || !newPassword || !confirm) redirect("/admin?error=pwreset");
  if (newPassword !== confirm) redirect("/admin?error=pwmatch");
  if (!isStrongPassword(newPassword)) redirect("/admin?error=pwweak");

  const req = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "pending") redirect("/admin?error=pwreset");

  await prisma.user.update({
    where: { id: req.userId },
    data: { password: hashPassword(newPassword), sessionVersion: { increment: 1 } },
  });
  await prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: { status: "completed", resolvedAt: new Date(), resolvedById: admin.id },
  });

  redirect("/admin?pwreset=done");
}

export async function dismissPasswordReset(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/dashboard");

  const requestId = String(formData.get("requestId") || "");
  if (!requestId) redirect("/admin");

  const req = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "pending") redirect("/admin?error=pwreset");

  await prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: { status: "dismissed", resolvedAt: new Date(), resolvedById: admin.id },
  });

  redirect("/admin?pwreset=dismissed");
}

function profileText(value: FormDataEntryValue | null | undefined, fallback = "", max?: number) {
  let text = String(value ?? fallback).trim();
  if (max !== undefined) text = text.slice(0, max);
  return text;
}

export async function updateProfile(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const raw = formData.get("photo");
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  const clear = String(formData.get("clearPhoto") || "") === "1";
  let photoKey = me.photoKey ?? "";

  if (file) {
    const saved = await saveAvatar(file);
    if ("error" in saved) redirect(`/profile/${me.id}?edit=1&error=${saved.error}`);
    if (me.photoKey) await removeAvatar(me.photoKey);
    photoKey = saved.key;
  } else if (clear && me.photoKey) {
    await removeAvatar(me.photoKey);
    photoKey = "";
  }

  const universityRaw = profileText(formData.get("university"), me.university);
  const university = resolveUniversity(universityRaw) || me.university;
  const studyStyle = profileText(formData.get("studyStyle"));
  const styleOk =
    !studyStyle || MEETUP_STYLES.includes(studyStyle as (typeof MEETUP_STYLES)[number]);

  try {
    await prisma.user.update({
      where: { id: me.id },
      data: {
        firstName: profileText(formData.get("firstName"), me.firstName, 60),
        lastName: profileText(formData.get("lastName"), me.lastName, 60),
        pronouns: profileText(formData.get("pronouns"), "", 40),
        year: profileText(formData.get("year"), "", 40),
        major: resolveMajor(profileText(formData.get("major"), "", 80)),
        university,
        bio: profileText(formData.get("bio"), "", 400),
        needHelp: profileText(formData.get("needHelp"), "", 200),
        canHelp: profileText(formData.get("canHelp"), "", 200),
        examCourse: resolveCourse(profileText(formData.get("examCourse"))),
        examDate: parseDateField(profileText(formData.get("examDate"))),
        examTopics: profileText(formData.get("examTopics"), "", 300),
        studyStyle: styleOk ? studyStyle : "",
        showEmail: formData.get("showEmail") === "1",
        photoKey,
      },
    });
  } catch {
    redirect(`/profile/${me.id}?edit=1&error=save`);
  }

  redirect(`/profile/${me.id}`);
}

export async function createMeeting(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const me = await getMe();
  if (!me) redirect("/login");

  const subject = resolveCourse(String(formData.get("subject") || ""));
  const topic = String(formData.get("topic") || "").trim();
  const timeRaw = String(formData.get("time") || "").trim();
  const meetDate = String(formData.get("meetDate") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const university = resolveUniversity(String(formData.get("university") || me.university));
  const notes = String(formData.get("notes") || "").trim().slice(0, 300);
  const groupKind = String(formData.get("groupKind") || "small").trim();
  const style = String(formData.get("style") || "").trim();
  const maxSizeRaw = Number(formData.get("maxSize") || 0);

  const time = formatTimeInput(timeRaw);
  const topics = splitList(topic);
  const kind = groupKindById(groupKind);

  if (!subject) return { error: "Enter a subject (2–80 characters)." };
  if (topics.length === 0 || topics.some((t) => t.length < 2 || t.length > 60)) {
    return { error: "Add at least one topic (2–60 characters each)." };
  }
  if (!isValidMeetDate(meetDate)) return { error: "Pick today or a future date." };
  if (!time) return { error: "Pick a valid meeting time from the time picker." };
  if (!location) return { error: "Enter a location." };
  if (location.length > 120) return { error: "Location is too long (max 120 characters)." };
  if (!university) return { error: "Pick a university so classmates can find this group." };
  if (!kind) return { error: "Pick a group size category." };
  if (!(MEETUP_STYLES as readonly string[]).includes(style)) {
    return { error: "Pick a meetup style from the list." };
  }

  const maxSize = kind.id === "partner" ? 2 : maxSizeRaw;
  if (!Number.isInteger(maxSize) || maxSize < kind.min || maxSize > kind.max) {
    return { error: `For ${kind.label}, size must be ${kind.min === kind.max ? kind.min : `${kind.min}–${kind.max}`}.` };
  }

  const isPrivate = formData.get("isPrivate") === "1";
  const requireApproval = isPrivate ? false : formData.get("requireApproval") === "1";

  const meeting = await prisma.meeting.create({
    data: {
      subject,
      topic: topics.join(", "),
      time,
      meetDate,
      location,
      university,
      notes,
      maxSize,
      groupKind: kind.id,
      style,
      isPrivate,
      requireApproval,
      hostId: me.id,
      members: { create: [{ userId: me.id }] },
    },
  });

  redirect(`/meetings/${meeting.id}`);
}

export async function updateMeeting(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const existing = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { members: true },
  });
  if (!existing) redirect("/groups");
  if (existing.hostId !== me.id) redirect(`/meetings/${meetingId}`);

  const subject = resolveCourse(String(formData.get("subject") || ""));
  const topic = String(formData.get("topic") || "").trim();
  const timeRaw = String(formData.get("time") || "").trim();
  const meetDate = String(formData.get("meetDate") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const university = resolveUniversity(String(formData.get("university") || me.university));
  const notes = String(formData.get("notes") || "").trim().slice(0, 300);
  const groupKind = String(formData.get("groupKind") || "small").trim();
  const style = String(formData.get("style") || "").trim();
  const maxSizeRaw = Number(formData.get("maxSize") || 0);

  const time = formatTimeInput(timeRaw);
  const topics = splitList(topic);
  const kind = groupKindById(groupKind);
  const memberCount = existing.members.length;

  if (!subject) return { error: "Enter a subject (2–80 characters)." };
  if (topics.length === 0 || topics.some((t) => t.length < 2 || t.length > 60)) {
    return { error: "Add at least one topic (2–60 characters each)." };
  }
  if (!isValidMeetDate(meetDate) && meetDate !== existing.meetDate) {
    return { error: "Pick today or a future date." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meetDate)) return { error: "Pick a valid date." };
  if (!time) return { error: "Pick a valid meeting time from the time picker." };
  if (!location) return { error: "Enter a location." };
  if (location.length > 120) return { error: "Location is too long (max 120 characters)." };
  if (!university) return { error: "Pick a university so classmates can find this group." };
  if (!kind) return { error: "Pick a group size category." };
  if (!(MEETUP_STYLES as readonly string[]).includes(style)) {
    return { error: "Pick a meetup style from the list." };
  }

  const maxSize = kind.id === "partner" ? 2 : maxSizeRaw;
  if (!Number.isInteger(maxSize) || maxSize < kind.min || maxSize > kind.max) {
    return { error: `For ${kind.label}, size must be ${kind.min === kind.max ? kind.min : `${kind.min}–${kind.max}`}.` };
  }
  if (maxSize < memberCount) {
    return { error: `Max people can't be under ${memberCount} (people already in the group).` };
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      subject,
      topic: topics.join(", "),
      time,
      meetDate,
      location,
      university,
      notes,
      maxSize,
      groupKind: kind.id,
      style,
      isPrivate: formData.get("isPrivate") === "1",
      requireApproval:
        formData.get("isPrivate") === "1" ? false : formData.get("requireApproval") === "1",
    },
  });

  redirect(`/meetings/${meetingId}`);
}

export async function joinMeeting(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const next = safeNextPath(String(formData.get("next") || ""), `/meetings/${meetingId}`);
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { members: true },
  });
  if (!meeting) redirect("/find");
  if (meeting.members.some((m) => m.userId === me.id)) redirect(next);
  if (meeting.isPrivate) redirect(`${next}?error=private`);

  if (meeting.requireApproval) {
    if (meeting.members.length >= meeting.maxSize) redirect(`${next}?error=full`);
    const existing = await prisma.meetingJoinRequest.findUnique({
      where: { meetingId_userId: { meetingId, userId: me.id } },
    });
    if (existing?.status === "pending") redirect(`${next}?notice=pending`);
    await prisma.meetingJoinRequest.upsert({
      where: { meetingId_userId: { meetingId, userId: me.id } },
      create: { meetingId, userId: me.id, status: "pending" },
      update: { status: "pending" },
    });
    redirect(`${next}?notice=requested`);
  }

  const result = await addMeetingMemberIfRoom(meetingId, me.id);
  if (result === "missing") redirect("/find");
  if (result === "full") redirect(`${next}?error=full`);
  redirect(next);
}

export async function approveJoinRequest(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const requestId = String(formData.get("requestId") || "");
  const meetingId = String(formData.get("meetingId") || "");
  const req = await prisma.meetingJoinRequest.findUnique({
    where: { id: requestId },
    include: { meeting: { include: { members: true } } },
  });
  if (!req || req.meetingId !== meetingId || req.status !== "pending") redirect(`/meetings/${meetingId}`);
  if (req.meeting.hostId !== me.id) redirect(`/meetings/${meetingId}`);

  const result = await addMeetingMemberIfRoom(meetingId, req.userId);
  if (result === "full") {
    await prisma.meetingJoinRequest.update({ where: { id: requestId }, data: { status: "declined" } });
    redirect(`/meetings/${meetingId}?error=full`);
  }
  if (result === "joined" || result === "member") {
    await prisma.meetingJoinRequest.delete({ where: { id: requestId } });
  }
  redirect(`/meetings/${meetingId}`);
}

export async function declineJoinRequest(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const requestId = String(formData.get("requestId") || "");
  const meetingId = String(formData.get("meetingId") || "");
  const req = await prisma.meetingJoinRequest.findUnique({
    where: { id: requestId },
    include: { meeting: true },
  });
  if (!req || req.meetingId !== meetingId || req.status !== "pending") redirect(`/meetings/${meetingId}`);
  if (req.meeting.hostId !== me.id) redirect(`/meetings/${meetingId}`);

  await prisma.meetingJoinRequest.update({ where: { id: requestId }, data: { status: "declined" } });
  redirect(`/meetings/${meetingId}`);
}

export async function leaveMeeting(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { members: { select: { userId: true } } },
  });
  if (!meeting) redirect("/groups");

  const isOwner = meeting.hostId === me.id;
  const isOnlyMember = meeting.members.length === 1 && meeting.members[0]?.userId === me.id;
  if (isOwner && !isOnlyMember) redirect(`/meetings/${meetingId}?error=owner`);

  await prisma.member.deleteMany({ where: { meetingId, userId: me.id } });
  await prisma.meetingJoinRequest.deleteMany({ where: { meetingId, userId: me.id } });

  const deleted = await removeMeetingIfEmpty(meetingId);
  redirect(deleted ? "/groups?notice=deleted" : "/groups");
}

export async function deleteMeeting(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { hostId: true },
  });
  if (!meeting) redirect("/groups");
  if (meeting.hostId !== me.id) redirect(`/meetings/${meetingId}`);

  await purgeMeeting(meetingId);
  redirect("/groups?notice=deleted");
}

export async function removeMeetingMember(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const userId = String(formData.get("userId") || "");
  if (!meetingId || !userId) redirect("/groups");

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { members: { select: { userId: true } } },
  });
  if (!meeting) redirect("/groups");
  if (meeting.hostId !== me.id) redirect(`/meetings/${meetingId}`);
  if (userId === me.id) redirect(`/meetings/${meetingId}`);
  if (!meeting.members.some((m) => m.userId === userId)) redirect(`/meetings/${meetingId}`);

  await prisma.$transaction([
    prisma.member.deleteMany({ where: { meetingId, userId } }),
    prisma.message.updateMany({
      where: { meetingId, userId },
      data: { authorRemoved: true },
    }),
    prisma.meetingJoinRequest.deleteMany({ where: { meetingId, userId } }),
    prisma.meetupInvite.deleteMany({ where: { meetingId, toId: userId } }),
  ]);

  redirect(`/meetings/${meetingId}?notice=member-removed`);
}

export async function sendMessage(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const text = String(formData.get("text") || "").trim().slice(0, 500);
  if (!meetingId) redirect("/groups");

  const member = await prisma.member.findUnique({
    where: { meetingId_userId: { meetingId, userId: me.id } },
  });
  if (!member) redirect(`/meetings/${meetingId}?error=join`);

  const raw = formData.get("file");
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  let fileName = "";
  let fileKey = "";
  let fileMime = "";

  if (file) {
    const saved = await saveAttach(file);
    if ("error" in saved) redirect(`/meetings/${meetingId}?error=${saved.error}`);
    fileName = saved.name;
    fileKey = saved.key;
    fileMime = saved.mime;
  }

  if (!text && !fileKey) redirect(`/meetings/${meetingId}?error=empty`);

  await prisma.message.create({
    data: { meetingId, userId: me.id, text, fileName, fileKey, fileMime },
  });
  await prisma.member.update({
    where: { meetingId_userId: { meetingId, userId: me.id } },
    data: { lastReadAt: new Date() },
  });
  redirect(`/meetings/${meetingId}`);
}

export async function markGroupSeen(meetingId: string) {
  const me = await getMe();
  if (!me || !meetingId) return;
  await prisma.member.updateMany({
    where: { meetingId, userId: me.id },
    data: { lastReadAt: new Date() },
  });
  await prisma.reactionNotice.updateMany({
    where: { userId: me.id, meetingId, seen: false },
    data: { seen: true },
  });
}

export async function inviteToMeetup(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const userId = String(formData.get("userId") || "");
  const next = safeNextPath(String(formData.get("next") || ""), meetingId ? `/meetings/${meetingId}` : "/groups");
  if (!meetingId || !userId || userId === me.id) redirect(next);

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { members: true },
  });
  if (!meeting) redirect("/groups");
  if (!meeting.members.some((m) => m.userId === me.id)) redirect(next);
  if (meeting.isPrivate && meeting.hostId !== me.id) redirect(next);
  if (meeting.members.some((m) => m.userId === userId)) redirect(next);
  if (meeting.members.length >= meeting.maxSize) redirect(`/meetings/${meetingId}?error=full`);

  if (await isBlockedBetween(me.id, userId)) redirect(next);

  const bond = await friendshipBetween(me.id, userId);
  if (!bond || bond.status !== "accepted") redirect(next);

  const existing = await prisma.meetupInvite.findUnique({
    where: { meetingId_toId: { meetingId, toId: userId } },
  });
  if (existing?.status === "pending" || existing?.status === "accepted") redirect(next);

  const invite =
    existing && existing.status === "declined"
      ? await prisma.meetupInvite.update({
          where: { id: existing.id },
          data: { status: "pending", fromId: me.id },
        })
      : await prisma.meetupInvite.create({
          data: { meetingId, fromId: me.id, toId: userId, status: "pending" },
        });

  const topicBit = meeting.topic ? ` — ${meeting.topic.split(",")[0].trim()}` : "";
  const when = [meeting.meetDate, meeting.time, meeting.location].filter(Boolean).join(" · ");
  await prisma.directMessage.create({
    data: {
      fromId: me.id,
      toId: userId,
      text: `Invited you to ${meeting.subject}${topicBit}${when ? `\n${when}` : ""}`,
      inviteId: invite.id,
      seen: false,
    },
  });

  redirect(next);
}

export async function acceptMeetupInvite(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const inviteId = String(formData.get("inviteId") || "");
  const invite = await prisma.meetupInvite.findUnique({
    where: { id: inviteId },
    include: { meeting: { include: { members: true } } },
  });
  if (!invite || invite.toId !== me.id) redirect("/friends");
  if (invite.status !== "pending") redirect(`/friends/${invite.fromId}`);
  if (await isBlockedBetween(me.id, invite.fromId)) redirect(`/friends/${invite.fromId}?error=blocked`);

  const meeting = invite.meeting;
  const joinResult = await addMeetingMemberIfRoom(meeting.id, me.id);
  if (joinResult === "full") {
    await prisma.meetupInvite.update({ where: { id: invite.id }, data: { status: "declined" } });
    redirect(`/friends/${invite.fromId}?error=full`);
  }
  if (joinResult === "missing") redirect("/friends");

  await prisma.meetupInvite.update({ where: { id: invite.id }, data: { status: "accepted" } });

  await prisma.directMessage.create({
    data: {
      fromId: me.id,
      toId: invite.fromId,
      text: `Accepted your invite to ${meeting.subject}.`,
      seen: false,
    },
  });

  redirect(`/meetings/${meeting.id}`);
}

export async function declineMeetupInvite(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const inviteId = String(formData.get("inviteId") || "");
  const invite = await prisma.meetupInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.toId !== me.id) redirect("/friends");
  if (invite.status === "pending") {
    await prisma.meetupInvite.update({ where: { id: invite.id }, data: { status: "declined" } });
    await prisma.directMessage.create({
      data: {
        fromId: me.id,
        toId: invite.fromId,
        text: "Declined the meetup invite.",
        seen: false,
      },
    });
  }
  redirect(`/friends/${invite.fromId}`);
}

async function friendshipBetween(a: string, b: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { fromId: a, toId: b },
        { fromId: b, toId: a },
      ],
    },
  });
}

export async function addFriend(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const next = safeNextPath(String(formData.get("next") || ""), userId ? `/profile/${userId}` : "/dashboard");
  if (!userId || userId === me.id) redirect(next);

  const other = await prisma.user.findUnique({ where: { id: userId } });
  if (!other) redirect(next);
  if (await isBlockedBetween(me.id, userId)) redirect(`${next}${next.includes("?") ? "&" : "?"}error=blocked`);

  const existing = await friendshipBetween(me.id, userId);
  if (existing?.status === "accepted") redirect(next);
  if (existing?.fromId === me.id) redirect(next);
  if (existing && existing.fromId === userId && existing.status === "pending") {
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
    redirect(next);
  }

  await prisma.friendship.create({ data: { fromId: me.id, toId: userId, status: "pending" } });
  redirect(next);
}

export async function acceptFriend(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const next = safeNextPath(String(formData.get("next") || ""), userId ? `/profile/${userId}` : "/dashboard");
  if (await isBlockedBetween(me.id, userId)) redirect(`${next}${next.includes("?") ? "&" : "?"}error=blocked`);
  const existing = await friendshipBetween(me.id, userId);
  if (existing && existing.toId === me.id && existing.status === "pending") {
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
  }
  redirect(next);
}

export async function sendDm(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const text = String(formData.get("text") || "").trim().slice(0, 500);
  if (!userId) redirect("/friends");

  const other = await prisma.user.findUnique({ where: { id: userId } });
  if (!other || other.id === me.id) redirect("/friends");
  if (await isBlockedBetween(me.id, userId)) redirect(`/friends/${userId}?error=blocked`);

  const bond = await friendshipBetween(me.id, userId);
  if (!bond || bond.status !== "accepted") redirect(`/friends/${userId}?error=buddy`);

  const raw = formData.get("file");
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  let fileName = "";
  let fileKey = "";
  let fileMime = "";

  if (file) {
    const saved = await saveAttach(file);
    if ("error" in saved) redirect(`/friends/${userId}?error=${saved.error}`);
    fileName = saved.name;
    fileKey = saved.key;
    fileMime = saved.mime;
  }

  if (!text && !fileKey) redirect(`/friends/${userId}?error=empty`);

  await prisma.directMessage.create({
    data: { fromId: me.id, toId: userId, text, fileName, fileKey, fileMime, seen: false },
  });
  redirect(`/friends/${userId}`);
}

export async function unsendDm(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const messageId = String(formData.get("messageId") || "");
  const userId = String(formData.get("userId") || "");
  const msg = await prisma.directMessage.findUnique({ where: { id: messageId } });
  if (!msg || msg.fromId !== me.id || msg.unsent) redirect(`/friends/${userId || ""}`);

  await prisma.directMessage.update({ where: { id: messageId }, data: { unsent: true } });
  redirect(`/friends/${userId}`);
}

export async function unsendMessage(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const messageId = String(formData.get("messageId") || "");
  const meetingId = String(formData.get("meetingId") || "");
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.userId !== me.id || msg.unsent) redirect(`/meetings/${meetingId}`);

  const member = await prisma.member.findUnique({
    where: { meetingId_userId: { meetingId: msg.meetingId, userId: me.id } },
  });
  if (!member) redirect(`/meetings/${meetingId}`);

  await prisma.message.update({ where: { id: messageId }, data: { unsent: true } });
  redirect(`/meetings/${meetingId}`);
}

export async function markDmSeen(userId: string) {
  const me = await getMe();
  if (!me || !userId || userId === me.id) return;
  await prisma.directMessage.updateMany({
    where: { fromId: userId, toId: me.id, seen: false },
    data: { seen: true },
  });
  await prisma.reactionNotice.updateMany({
    where: { userId: me.id, actorId: userId, seen: false, dmId: { not: "" } },
    data: { seen: true },
  });
}

export async function removeFriend(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const next = safeNextPath(String(formData.get("next") || ""), `/profile/${userId}`);
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { fromId: me.id, toId: userId },
        { fromId: userId, toId: me.id },
      ],
    },
  });
  redirect(next);
}

export async function blockUser(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const next = safeNextPath(String(formData.get("next") || ""), `/profile/${userId}`);
  if (!userId || userId === me.id) redirect(next);

  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { fromId: me.id, toId: userId },
        { fromId: userId, toId: me.id },
      ],
    },
  });
  await prisma.meetupInvite.deleteMany({
    where: {
      status: "pending",
      OR: [
        { fromId: me.id, toId: userId },
        { fromId: userId, toId: me.id },
      ],
    },
  });
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: me.id, blockedId: userId } },
    create: { blockerId: me.id, blockedId: userId },
    update: {},
  });
  const dest = next.startsWith(`/profile/${userId}`) ? `/profile/${userId}?blocked=1` : next;
  redirect(dest);
}

export async function unblockUser(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const next = safeNextPath(String(formData.get("next") || ""), `/profile/${userId}`);
  if (!userId || userId === me.id) redirect(next);
  if (!(await blockedByMe(me.id, userId))) redirect(next);

  await prisma.block.delete({
    where: { blockerId_blockedId: { blockerId: me.id, blockedId: userId } },
  });
  redirect(next);
}

export type PeopleHit = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  year: string;
  major: string;
  status: "none" | "friends" | "sent" | "incoming";
};

export async function searchPeople(_prev: { results: PeopleHit[]; ran: boolean } | null, formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const q = String(formData.get("q") || "").trim().toLowerCase();
  const uni = String(formData.get("university") || "").trim();
  const year = String(formData.get("year") || "").trim();
  const major = resolveMajor(String(formData.get("major") || ""));

  const users = await prisma.user.findMany({
    where: {
      id: { not: me.id },
      ...(uni ? { university: { contains: uni } } : {}),
      ...(year ? { year } : {}),
      ...(major ? { major } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      showEmail: true,
      university: true,
      year: true,
      major: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 80,
  });

  const blocked = await blockedUserIds(me.id);
  const filtered = (q
    ? users.filter((u) => {
        const haystack = u.showEmail
          ? `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase()
          : `${u.firstName} ${u.lastName}`.toLowerCase();
        return haystack.includes(q);
      })
    : users
  ).filter((u) => !blocked.has(u.id));

  const ids = filtered.slice(0, 20).map((u) => u.id);
  const bonds = ids.length
    ? await prisma.friendship.findMany({
        where: {
          OR: [{ fromId: me.id, toId: { in: ids } }, { fromId: { in: ids }, toId: me.id }],
        },
      })
    : [];

  const results: PeopleHit[] = filtered.slice(0, 20).map((u) => {
    const bond = bonds.find(
      (b) => (b.fromId === me.id && b.toId === u.id) || (b.fromId === u.id && b.toId === me.id),
    );
    let status: PeopleHit["status"] = "none";
    if (bond?.status === "accepted") status = "friends";
    else if (bond?.status === "pending" && bond.fromId === me.id) status = "sent";
    else if (bond?.status === "pending") status = "incoming";
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.showEmail ? u.email : "",
      university: u.university,
      year: u.year,
      major: u.major,
      status,
    };
  });

  return { results, ran: true };
}

export async function deleteUser(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/dashboard");

  const userId = String(formData.get("userId") || "");
  if (!userId) redirect("/admin");
  if (userId === admin.id) redirect("/admin?error=self");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/admin?error=missing");

  if (user.photoKey) await removeAvatar(user.photoKey);

  const dms = await prisma.directMessage.findMany({
    where: {
      OR: [{ fromId: userId }, { toId: userId }],
      fileKey: { not: "" },
    },
    select: { fileKey: true },
  });
  for (const dm of dms) await removeAttach(dm.fileKey);

  const groupFiles = await prisma.message.findMany({
    where: { userId, fileKey: { not: "" } },
    select: { fileKey: true },
  });
  for (const msg of groupFiles) await removeAttach(msg.fileKey);

  await prisma.user.delete({ where: { id: userId } });
  redirect("/admin?deleted=1");
}
