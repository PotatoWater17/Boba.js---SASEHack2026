"use server";

import { redirect } from "next/navigation";
import { COURSES, groupKindById, MEETUP_STYLES } from "@/courses";
import { saveAttach } from "@/files";
import { resolveUniversity } from "@/universities";
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

  await prisma.user.update({
    where: { id: me.id },
    data: {
      firstName: String(formData.get("firstName") || me.firstName).trim(),
      lastName: String(formData.get("lastName") || me.lastName).trim(),
      pronouns: String(formData.get("pronouns") || "").trim(),
      year: String(formData.get("year") || "").trim(),
      major: String(formData.get("major") || "").trim(),
      university: resolveUniversity(String(formData.get("university") || me.university)),
      bio: String(formData.get("bio") || "")
        .trim()
        .slice(0, 400),
      needHelp: String(formData.get("needHelp") || "").trim(),
      canHelp: String(formData.get("canHelp") || "").trim(),
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
  redirect(`/meetings/${meetingId}`);
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
  const next = String(formData.get("next") || "") || `/profile/${userId}`;
  const existing = await friendshipBetween(me.id, userId);
  if (existing && existing.toId === me.id && existing.status === "pending") {
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
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
    data: { fromId: me.id, toId: userId, text, fileName, fileKey, fileMime },
  });
  redirect(`/friends/${userId}`);
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
