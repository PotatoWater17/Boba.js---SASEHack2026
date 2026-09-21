import type { ReactionView } from "@/reactions";

export type ChatSendResult =
  | { ok: true; message: PostedChatMessage }
  | { error: string };

export type PostedChatMessage = {
  id: string;
  createdAt: string;
  text: string;
  fileKey: string;
  fileName: string;
  fileMime: string;
};

export type DmInviteView = {
  id: string;
  status: string;
  meetingId: string;
  meeting: { subject: string; topic: string; meetDate: string; time: string; location: string };
};

export type DmLine = {
  id: string;
  fromId: string;
  fromName: string;
  createdAt: string;
  text: string;
  unsent: boolean;
  fileKey: string;
  fileName: string;
  fileMime: string;
  inviteId: string;
  invite: DmInviteView | null;
  reactions: ReactionView[];
  ago: string;
  pending?: boolean;
  previewUrl?: string;
};

export type GroupLine = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  createdAt: string;
  text: string;
  unsent: boolean;
  authorRemoved: boolean;
  fileKey: string;
  fileName: string;
  fileMime: string;
  reactions: ReactionView[];
  pending?: boolean;
  previewUrl?: string;
};

function lineTime(iso?: string) {
  const n = Date.parse(iso || "");
  return Number.isFinite(n) ? n : 0;
}

function pickChatLine<
  T extends {
    id: string;
    unsent: boolean;
    pending?: boolean;
    reactions?: unknown[];
    authorRemoved?: boolean;
    invite?: unknown;
    previewUrl?: string;
  },
>(a: T, b: T): T {
  const aTmp = a.id.startsWith("tmp-");
  const bTmp = b.id.startsWith("tmp-");
  const primary = aTmp && !bTmp ? b : bTmp && !aTmp ? a : a.pending && !b.pending ? b : b.pending && !a.pending ? a : b;
  const other = primary === a ? b : a;
  const aReacts = Array.isArray(a.reactions) ? a.reactions.length : 0;
  const bReacts = Array.isArray(b.reactions) ? b.reactions.length : 0;
  return {
    ...other,
    ...primary,
    id: aTmp && !bTmp ? b.id : bTmp && !aTmp ? a.id : primary.id,
    unsent: Boolean(a.unsent || b.unsent),
    pending: Boolean(a.pending && b.pending),
    reactions: (bReacts > aReacts ? b.reactions : a.reactions) as T["reactions"],
    authorRemoved: Boolean(a.authorRemoved || b.authorRemoved),
    invite: primary.invite ?? other.invite,
    previewUrl: primary.previewUrl || other.previewUrl,
  };
}

export function mergeChatLines<T extends { id: string; unsent: boolean; text?: string; createdAt?: string; fileName?: string; pending?: boolean }>(
  server: T[],
  extra: T[],
  unsentIds: string[],
  _who: (row: T) => string = () => "",
) {
  const unsent = new Set(unsentIds);
  const byId = new Map<string, T>();
  for (const raw of [...extra, ...server]) {
    const row = unsent.has(raw.id) ? { ...raw, unsent: true } : raw;
    const prev = byId.get(row.id);
    byId.set(row.id, prev ? pickChatLine(prev, row) : row);
  }

  return [...byId.values()].sort((a, b) => {
    const dt = lineTime(a.createdAt) - lineTime(b.createdAt);
    if (dt !== 0) return dt;
    return a.id.localeCompare(b.id);
  });
}
