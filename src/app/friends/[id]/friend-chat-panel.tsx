"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { sendDm } from "@/app/actions";
import { ChatCompose } from "@/chat-compose";
import { ChatDropZone } from "@/chat-drop";
import { type DmLine, mergeChatLines } from "@/chat-payload";
import { loadChatPersist, saveChatPersist } from "@/chat-persist";
import { ChatReactions } from "@/chat-reactions";
import { CopyMessageButton } from "@/copy-message-btn";
import { isImageMime } from "@/chat-attach";
import { messageCopyText } from "@/message-copy";
import { isNextRedirect } from "@/next-redirect";
import { UnsendButton } from "@/unsend-btn";
import { DmImage } from "./dm-image";
import { InviteCard } from "./invite-card";
import { SeenOnOpen } from "./seen";
import { DmThread } from "./thread";

function newTempId() {
  return `tmp-${crypto.randomUUID()}`;
}

export function FriendChatPanel({
  friendId,
  meId,
  meName,
  messages,
}: {
  friendId: string;
  meId: string;
  meName: string;
  messages: DmLine[];
}) {
  const persistKey = `dm:${meId}:${friendId}`;
  const [extra, setExtra] = useState<DmLine[]>([]);
  const [unsentIds, setUnsentIds] = useState<string[]>([]);
  const [live, setLive] = useState(messages);
  const previews = useRef<string[]>([]);
  const loadedKey = useRef("");

  const lines = useMemo(
    () => mergeChatLines(live, extra, unsentIds, (m) => m.fromId),
    [live, extra, unsentIds],
  );

  useEffect(() => {
    setLive((cur) => mergeChatLines(messages, cur, [], (m) => m.fromId));
  }, [messages]);

  useLayoutEffect(() => {
    const stored = loadChatPersist<DmLine>(persistKey);
    setExtra(stored.extra);
    setUnsentIds(stored.unsentIds);
    loadedKey.current = persistKey;
  }, [persistKey]);

  useEffect(() => {
    if (loadedKey.current !== persistKey) return;
    saveChatPersist(persistKey, extra, unsentIds);
  }, [persistKey, extra, unsentIds]);

  useEffect(() => {
    let ignore = false;
    async function pull() {
      const res = await fetch(`/api/chat/dm?userId=${encodeURIComponent(friendId)}`, { cache: "no-store" });
      if (!res.ok || ignore) return;
      const data = (await res.json()) as { messages?: DmLine[] };
      if (!Array.isArray(data.messages)) return;
      setLive((cur) => mergeChatLines(data.messages, cur, [], (m) => m.fromId));
    }
    void pull();
    return () => {
      ignore = true;
    };
  }, [friendId]);

  function forgetPreview(url?: string) {
    if (!url) return;
    URL.revokeObjectURL(url);
    previews.current = previews.current.filter((u) => u !== url);
  }

  async function send(fd: FormData) {
    const text = String(fd.get("text") || "").trim();
    const raw = fd.get("file");
    const file = raw instanceof File && raw.size > 0 ? raw : null;
    const tempId = newTempId();
    const previewUrl =
      file && file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    if (previewUrl) previews.current.push(previewUrl);

    const pending: DmLine = {
      id: tempId,
      fromId: meId,
      fromName: meName,
      createdAt: new Date().toISOString(),
      text,
      unsent: false,
      fileKey: file ? "pending" : "",
      fileName: file?.name || "",
      fileMime: file?.type || "",
      inviteId: "",
      invite: null,
      reactions: [],
      ago: "just now",
      pending: true,
      previewUrl,
    };
    setExtra((cur) => [...cur.filter((m) => !m.pending), pending]);
    saveChatPersist(persistKey, [pending], unsentIds);

    try {
      const result = await sendDm(fd);
      if (!result || result.error) {
        setExtra((cur) => cur.filter((m) => m.id !== tempId));
        forgetPreview(previewUrl);
        return result;
      }
      if (result.ok && result.message) {
        const confirmed: DmLine = {
          ...pending,
          id: result.message.id,
          createdAt: result.message.createdAt,
          text: result.message.text,
          fileKey: result.message.fileKey,
          fileName: result.message.fileName,
          fileMime: result.message.fileMime,
          pending: false,
          previewUrl: result.message.fileKey ? "" : previewUrl,
        };
        setExtra((cur) => [
          ...cur.filter((m) => m.id !== tempId && m.id !== result.message.id),
          confirmed,
        ]);
        saveChatPersist(persistKey, [confirmed], unsentIds);
        if (result.message.fileKey) forgetPreview(previewUrl);
        void fetch(`/api/chat/dm?userId=${encodeURIComponent(friendId)}`, { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { messages?: DmLine[] } | null) => {
            if (Array.isArray(data?.messages)) {
              setLive((cur) => mergeChatLines(data.messages, cur, [], (m) => m.fromId));
            }
          })
          .catch(() => {});
      }
      return result;
    } catch (err) {
      setExtra((cur) => cur.filter((m) => m.id !== tempId));
      forgetPreview(previewUrl);
      if (isNextRedirect(err)) throw err;
      return { error: "send" };
    }
  }

  return (
    <ChatDropZone className="chat-drop-zone-fill">
      <SeenOnOpen userId={friendId} />
      <div className="card">
        <DmThread messageCount={lines.length}>
          {lines.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>
              No messages yet. Say hi.
            </p>
          ) : (
            lines.map((msg) => {
              const invite = msg.invite;
              const copyText = !msg.unsent && !invite ? messageCopyText(msg) : "";
              const imageSrc = msg.previewUrl || (msg.fileKey && msg.fileKey !== "pending" ? `/api/files/${msg.id}` : "");
              return (
                <div key={msg.id} className={`dm-bubble${msg.fromId === meId ? " mine" : ""}`}>
                  <div className="dm-bubble-meta">
                    {msg.fromName} · {msg.pending ? "sending…" : msg.ago}
                    {!msg.unsent && !msg.pending && (copyText || (msg.fromId === meId && !invite)) ? (
                      <div className="dm-bubble-actions">
                        {copyText ? <CopyMessageButton text={copyText} /> : null}
                        {msg.fromId === meId && !invite ? (
                          <UnsendButton
                            kind="dm"
                            messageId={msg.id}
                            userId={friendId}
                            onOptimistic={() =>
                              setUnsentIds((ids) => (ids.includes(msg.id) ? ids : [...ids, msg.id]))
                            }
                            onRevert={() => setUnsentIds((ids) => ids.filter((id) => id !== msg.id))}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {msg.unsent ? (
                    <div className="msg-unsent">Unsent</div>
                  ) : (
                    <>
                      {invite ? (
                        <InviteCard invite={invite} mine={msg.fromId === meId} />
                      ) : msg.text ? (
                        <div className="dm-text">{msg.text}</div>
                      ) : null}
                      {imageSrc && isImageMime(msg.fileMime) ? (
                        <DmImage src={imageSrc} alt={msg.fileName || "Photo"} />
                      ) : msg.fileKey ? (
                        msg.fileKey === "pending" ? (
                          <div className="dm-file">{msg.fileName || "Attachment"}</div>
                        ) : (
                          <a className="dm-file" href={`/api/files/${msg.id}`}>
                            {msg.fileName || "Attachment"}
                          </a>
                        )
                      ) : null}
                      {!msg.pending ? (
                        <ChatReactions
                          kind="dm"
                          messageId={msg.id}
                          meId={meId}
                          initial={msg.reactions}
                        />
                      ) : null}
                    </>
                  )}
                </div>
              );
            })
          )}
        </DmThread>
        <ChatCompose action={send} hidden={{ userId: friendId }} placeholder="Type a message..." />
      </div>
    </ChatDropZone>
  );
}
