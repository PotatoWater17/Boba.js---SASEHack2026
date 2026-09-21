import { cookies } from "next/headers";
import type { DmLine, GroupLine } from "@/chat-payload";
import { timeAgo } from "@/utils";

export const CHAT_COOKIE = "sbb_chat_v2";
const MAX_PER_THREAD = 40;
const MAX_COOKIE_CHARS = 3200;

export type OverlayDm = {
  k: "d";
  id: string;
  at: string;
  text: string;
  unsent?: boolean;
  fromId: string;
  fromName: string;
  fileKey?: string;
  fileName?: string;
  fileMime?: string;
};

export type OverlayGroup = {
  k: "g";
  id: string;
  at: string;
  text: string;
  unsent?: boolean;
  userId: string;
  firstName: string;
  lastName: string;
  photoKey?: string;
  fileKey?: string;
  fileName?: string;
  fileMime?: string;
};

export type OverlayLine = OverlayDm | OverlayGroup;

type OverlayMap = Record<string, OverlayLine[]>;

const g = globalThis as { __sbbChatOverlay?: OverlayMap };

function mem(): OverlayMap {
  if (!g.__sbbChatOverlay) g.__sbbChatOverlay = {};
  return g.__sbbChatOverlay;
}

export function dmThreadKey(a: string, b: string) {
  return a < b ? `d:${a}:${b}` : `d:${b}:${a}`;
}

export function groupThreadKey(meetingId: string) {
  return `g:${meetingId}`;
}

function parseOverlay(raw?: string): OverlayMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as OverlayMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function readCookieMap(): Promise<OverlayMap> {
  return parseOverlay((await cookies()).get(CHAT_COOKIE)?.value);
}

function mergeLists(a: OverlayLine[], b: OverlayLine[]) {
  const byId = new Map<string, OverlayLine>();
  for (const row of a) byId.set(row.id, row);
  for (const row of b) {
    const prev = byId.get(row.id);
    byId.set(row.id, prev && row.unsent ? { ...prev, unsent: true } : { ...prev, ...row });
  }
  return [...byId.values()]
    .sort((x, y) => x.at.localeCompare(y.at))
    .slice(-MAX_PER_THREAD);
}

export async function readChatOverlay(thread: string) {
  const fromCookie = (await readCookieMap())[thread] || [];
  const fromMem = mem()[thread] || [];
  return mergeLists(fromMem, fromCookie);
}

async function writeCookieMap(all: OverlayMap) {
  let encoded = encodeURIComponent(JSON.stringify(all));
  const keys = Object.keys(all);
  while (encoded.length > MAX_COOKIE_CHARS && keys.length > 1) {
    let drop = keys[0];
    let oldest = Number.POSITIVE_INFINITY;
    for (const key of keys) {
      const last = all[key]?.at(-1)?.at || "";
      const t = Date.parse(last) || 0;
      if (t < oldest) {
        oldest = t;
        drop = key;
      }
    }
    delete all[drop];
    const idx = keys.indexOf(drop);
    if (idx >= 0) keys.splice(idx, 1);
    encoded = encodeURIComponent(JSON.stringify(all));
  }
  (await cookies()).set(CHAT_COOKIE, encoded, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function rememberChatOverlay(thread: string, line: OverlayLine) {
  const all = { ...(await readCookieMap()) };
  const merged = mergeLists(mem()[thread] || [], all[thread] || []);
  const next = mergeLists(merged.filter((row) => !row.id.startsWith("tmp-") || row.id === line.id), [line]);
  mem()[thread] = next;
  all[thread] = next;
  await writeCookieMap(all);
}

export async function markOverlayUnsent(thread: string, id: string) {
  const all = { ...(await readCookieMap()) };
  const next = mergeLists(mem()[thread] || [], all[thread] || []).map((row) =>
    row.id === id ? { ...row, unsent: true } : row,
  );
  mem()[thread] = next;
  all[thread] = next;
  await writeCookieMap(all);
}

export function overlayToDmLine(row: OverlayLine): DmLine | null {
  if (row.k !== "d") return null;
  return {
    id: row.id,
    fromId: row.fromId,
    fromName: row.fromName,
    createdAt: row.at,
    text: row.text,
    unsent: Boolean(row.unsent),
    fileKey: row.fileKey || "",
    fileName: row.fileName || "",
    fileMime: row.fileMime || "",
    inviteId: "",
    invite: null,
    reactions: [],
    ago: timeAgo(row.at),
  };
}

export function overlayToGroupLine(row: OverlayLine): GroupLine | null {
  if (row.k !== "g") return null;
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    photoKey: row.photoKey || "",
    createdAt: row.at,
    text: row.text,
    unsent: Boolean(row.unsent),
    authorRemoved: false,
    fileKey: row.fileKey || "",
    fileName: row.fileName || "",
    fileMime: row.fileMime || "",
    reactions: [],
  };
}
