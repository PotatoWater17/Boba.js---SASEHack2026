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

export function mergeChatLines<T extends { id: string; unsent: boolean; text?: string; createdAt?: string; fileName?: string }>(
  server: T[],
  extra: T[],
  unsentIds: string[],
  who: (row: T) => string = () => "",
) {
  const ids = new Set(server.map((m) => m.id));
  const unsent = new Set(unsentIds);
  const shown = server.map((m) => (unsent.has(m.id) ? { ...m, unsent: true } : m));
  return [
    ...shown,
    ...extra.filter((m) => {
      if (ids.has(m.id)) return false;
      const fingerprint = `${who(m)}|${m.text || ""}|${m.fileName || ""}`;
      const extraAt = Date.parse(m.createdAt || "") || 0;
      return !server.some((s) => {
        if (`${who(s)}|${s.text || ""}|${s.fileName || ""}` !== fingerprint) return false;
        const serverAt = Date.parse(s.createdAt || "") || 0;
        return Math.abs(serverAt - extraAt) < 120000;
      });
    }),
  ];
}
