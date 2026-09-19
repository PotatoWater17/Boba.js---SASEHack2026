import { redirect } from "next/navigation";
import { getMe } from "@/lib";

const DEFAULT_ADMIN_EMAILS = [
  "ryanh@auburn.edu",
  "aidenb@auburn.edu",
  "bryanm@auburn.edu",
  "danielk@auburn.edu",
];

function adminEmails() {
  const raw = process.env.ADMIN_EMAILS;
  const list = raw ? raw.split(",") : DEFAULT_ADMIN_EMAILS;
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isUserAdmin(user: { isAdmin: boolean; email: string }) {
  return user.isAdmin || adminEmails().includes(user.email.toLowerCase());
}

export async function getAdmin() {
  const me = await getMe();
  if (!me || !isUserAdmin(me)) return null;
  return me;
}

export async function requireAdmin() {
  const me = await getAdmin();
  if (!me) redirect("/dashboard");
  return me;
}
