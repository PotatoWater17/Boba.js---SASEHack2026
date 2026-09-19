"use server";

import { redirect } from "next/navigation";
import { COURSES, groupKindById, MEETUP_STYLES } from "@/courses";
import { saveAttach, saveAvatar, removeAvatar } from "@/files";
import { resolveUniversity } from "@/universities";
import { resolveMajor } from "@/majors";
import { clearUser, formatTimeInput, getMe, hashPassword, isStrongPassword, isValidMeetDate, prisma, setUser, splitList } from "@/lib";

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
    redirect("/login?error=fill");
  }
  if (password !== confirm) redirect("/login?error=match");
  if (!isStrongPassword(password)) redirect("/login?error=weak");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) redirect("/login?error=exists");

  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      firstName,
      lastName,
      university,
    },
  });

  await setUser(user.id);
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.password !== hashPassword(password)) {
    redirect("/login?error=bad");
  }

  await setUser(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await clearUser();
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const raw = formData.get("photo");
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  const clear = String(formData.get("clearPhoto") || "") === "1";
  let photoKey = me.photoKey;

  if (file) {
    const saved = await saveAvatar(file);
    if ("error" in saved) redirect(`/profile/${me.id}?edit=1&error=${saved.error}`);
    if (me.photoKey) await removeAvatar(me.photoKey);
    photoKey = saved.key;
  } else if (clear && me.photoKey) {
    await removeAvatar(me.photoKey);
    photoKey = "";
  }

  await prisma.user.update({
    where: { id: me.id },
    data: {
      firstName: String(formData.get("firstName") || me.firstName).trim(),
      lastName: String(formData.get("lastName") || me.lastName).trim(),
      pronouns: String(formData.get("pronouns") || "").trim(),
      year: String(formData.get("year") || "").trim(),
      major: resolveMajor(String(formData.get("major") || "")),
      university: resolveUniversity(String(formData.get("university") || me.university)),
      bio: String(formData.get("bio") || "")
        .trim()
        .slice(0, 400),
      needHelp: String(formData.get("needHelp") || "").trim(),
      canHelp: String(formData.get("canHelp") || "").trim(),
      photoKey,
    },
  });

  redirect(`/profile/${me.id}`);
}

export async function createMeeting(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const me = await getMe();
  if (!me) redirect("/login");

  const subject = String(formData.get("subject") || "").trim();
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

  if (!COURSES.includes(subject)) return { error: "Pick a subject from the dropdown." };
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

  const subject = String(formData.get("subject") || "").trim();
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

  if (!COURSES.includes(subject)) return { error: "Pick a subject from the dropdown." };
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
    },
  });

  redirect(`/meetings/${meetingId}`);
}

export async function joinMeeting(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { members: true },
  });
  if (!meeting) redirect("/find");
  if (meeting.members.length >= meeting.maxSize) redirect(`/meetings/${meetingId}?error=full`);
  if (meeting.members.some((m) => m.userId === me.id)) redirect(`/meetings/${meetingId}`);

  await prisma.member.create({ data: { meetingId, userId: me.id } });
  redirect(`/meetings/${meetingId}`);
}

export async function leaveMeeting(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  await prisma.member.deleteMany({ where: { meetingId, userId: me.id } });
  redirect("/groups");
}

export async function sendMessage(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const text = String(formData.get("text") || "").trim();
  if (!text) redirect(`/meetings/${meetingId}`);

  const member = await prisma.member.findUnique({
    where: { meetingId_userId: { meetingId, userId: me.id } },
  });
  if (!member) redirect(`/meetings/${meetingId}?error=join`);

  await prisma.message.create({ data: { meetingId, userId: me.id, text } });
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
}

export async function inviteToMeetup(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetingId = String(formData.get("meetingId") || "");
  const userId = String(formData.get("userId") || "");
  const next = nextPath(formData, meetingId ? `/meetings/${meetingId}` : "/groups");
  if (!meetingId || !userId || userId === me.id) redirect(next);

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { members: true },
  });
  if (!meeting) redirect("/groups");
  if (!meeting.members.some((m) => m.userId === me.id)) redirect(next);
  if (meeting.members.some((m) => m.userId === userId)) redirect(next);
  if (meeting.members.length >= meeting.maxSize) redirect(`/meetings/${meetingId}?error=full`);

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

  const meeting = invite.meeting;
  if (meeting.members.length >= meeting.maxSize) {
    await prisma.meetupInvite.update({ where: { id: invite.id }, data: { status: "declined" } });
    redirect(`/friends/${invite.fromId}?error=full`);
  }

  if (!meeting.members.some((m) => m.userId === me.id)) {
    await prisma.member.create({ data: { meetingId: meeting.id, userId: me.id } });
  }
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

function nextPath(formData: FormData, fallback: string) {
  const next = String(formData.get("next") || "") || fallback;
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function addFriend(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const next = nextPath(formData, userId ? `/profile/${userId}` : "/dashboard");
  if (!userId || userId === me.id) redirect(next);

  const other = await prisma.user.findUnique({ where: { id: userId } });
  if (!other) redirect(next);

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
  const next = nextPath(formData, userId ? `/profile/${userId}` : "/dashboard");
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

export async function markDmSeen(userId: string) {
  const me = await getMe();
  if (!me || !userId || userId === me.id) return;
  await prisma.directMessage.updateMany({
    where: { fromId: userId, toId: me.id, seen: false },
    data: { seen: true },
  });
}

export async function removeFriend(formData: FormData) {
  const me = await getMe();
  if (!me) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const next = String(formData.get("next") || "") || `/profile/${userId}`;
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { fromId: me.id, toId: userId },
        { fromId: userId, toId: me.id },
      ],
    },
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
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
      university: true,
      year: true,
      major: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 80,
  });

  const filtered = q
    ? users.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
    : users;

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
    return { ...u, status };
  });

  return { results, ran: true };
}
