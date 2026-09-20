/** Shared types + password hints for demo account backup/restore. */
import { hashPassword } from "../src/auth";

export const SNAPSHOT_PATH = "prisma/accounts.snapshot.json";

export type SnapshotUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  pronouns: string;
  year: string;
  major: string;
  university: string;
  bio: string;
  needHelp: string;
  canHelp: string;
  examCourse: string;
  examDate: string;
  examTopics: string;
  studyStyle: string;
  isAdmin: boolean;
  showEmail: boolean;
  accountNo: number | null;
};

export type SnapshotFriendship = {
  fromEmail: string;
  toEmail: string;
  status: string;
};

export type AccountSnapshot = {
  version: 1;
  exportedAt: string;
  users: SnapshotUser[];
  friendships: SnapshotFriendship[];
};

const DEV_PASSWORDS: Record<string, string> = {
  "ryanh@auburn.edu": "RyanH",
  "aidenb@auburn.edu": "AidenB",
  "bryanm@auburn.edu": "BryanM",
  "danielk@auburn.edu": "DanielK",
};

export function demoPasswordForEmail(email: string) {
  return DEV_PASSWORDS[email.toLowerCase()] ?? "Password1!";
}

export function hashDemoPassword(email: string, password?: string) {
  return hashPassword(password || demoPasswordForEmail(email));
}
