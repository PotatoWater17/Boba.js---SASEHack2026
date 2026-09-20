import { redirect } from "next/navigation";
import { getMe } from "@/lib";

export function isUserAdmin(user: { isAdmin: boolean }) {
  return user.isAdmin;
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
