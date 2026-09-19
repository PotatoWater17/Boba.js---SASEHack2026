"use server";

import { redirect } from "next/navigation";
import { clearUser, formatTimeInput, getMe, hashPassword, isStrongPassword, isValidMeetDate, prisma, setUser, splitList } from "@/lib";
import { COURSES } from "@/courses";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();

  if (!email || !password || !firstName || !lastName) {
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
  const notes = String(formData.get("notes") || "").trim().slice(0, 300);
  const maxSize = Number(formData.get("maxSize") || 8);

  const time = formatTimeInput(timeRaw);
  const topics = splitList(topic);

  if (!COURSES.includes(subject)) return { error: "Pick a subject from the dropdown." };
  if (topics.length === 0 || topics.some((t) => t.length < 2 || t.length > 60)) {
    return { error: "Add at least one topic (2–60 characters each)." };
  }
  if (!isValidMeetDate(meetDate)) return { error: "Pick today or a future date." };
  if (!time) return { error: "Pick a valid meeting time from the time picker." };
  if (!location) return { error: "Enter a location." };
  if (location.length > 120) return { error: "Location is too long (max 120 characters)." };
  if (!Number.isInteger(maxSize) || maxSize < 2 || maxSize > 20) {
    return { error: "Group size must be a whole number from 2 to 20." };
  }

  const meeting = await prisma.meeting.create({
    data: {
      subject,
      topic: topics.join(", "),
      time,
      meetDate,
      location,
      notes,
      maxSize,
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
