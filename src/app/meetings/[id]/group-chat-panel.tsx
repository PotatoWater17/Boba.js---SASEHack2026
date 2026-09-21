"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { sendMessage } from "@/app/actions";
import { Avatar } from "@/avatar";
import { ChatCompose } from "@/chat-compose";
import { ChatDropZone } from "@/chat-drop";
import { type GroupLine, mergeChatLines } from "@/chat-payload";
import { loadChatPersist, saveChatPersist } from "@/chat-persist";
import { ChatReactions } from "@/chat-reactions";
import { CopyMessageButton } from "@/copy-message-btn";
import { isImageMime } from "@/chat-attach";
import { messageCopyText } from "@/message-copy";
import { isNextRedirect } from "@/next-redirect";
import { UnsendButton } from "@/unsend-btn";
import { DmImage } from "@/app/friends/[id]/dm-image";
import { DmThread } from "@/app/friends/[id]/thread";

function newTempId() {
  return `tmp-${crypto.randomUUID()}`;
}

export function GroupChatPanel({
  meetingId,
  meId,
  meFirst,
  meLast,
  mePhotoKey,
  messages,
}: {
  meetingId: string;
  meId: string;
  meFirst: string;
  meLast: string;
  mePhotoKey: string;
  messages: GroupLine[];
}) {
  const persistKey = `group:${meetingId}`;
  const [extra, setExtra] = useState<GroupLine[]>([]);
  const [unsentIds, setUnsentIds] = useState<string[]>([]);
  const [live, setLive] = useState(messages);
  const previews = useRef<string[]>([]);
  const loadedKey = useRef("");

  const lines = useMemo(
    () => mergeChatLines(live, extra, unsentIds, (m) => m.userId),
    [live, extra, unsentIds],
  );

  useEffect(() => {
    setLive((cur) => mergeChatLines(messages, cur, [], (m) => m.userId));
  }, [messages]);

  useLayoutEffect(() => {
    const stored = loadChatPersist<GroupLine>(persistKey);
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
      const res = await fetch(`/api/chat/group?meetingId=${encodeURIComponent(meetingId)}`, { cache: "no-store" });
      if (!res.ok || ignore) return;
      const data = (await res.json()) as { messages?: GroupLine[] };
      const incoming = data.messages;
      if (!Array.isArray(incoming)) return;
      setLive((cur) => mergeChatLines(incoming, cur, [], (m) => m.userId));
    }
    void pull();
    const id = window.setInterval(() => void pull(), 2500);
    return () => {
      ignore = true;
      window.clearInterval(id);
    };
  }, [meetingId]);

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

    const pending: GroupLine = {
      id: tempId,
      userId: meId,
      firstName: meFirst,
      lastName: meLast,
      photoKey: mePhotoKey,
      createdAt: new Date().toISOString(),
      text,
      unsent: false,
      authorRemoved: false,
      fileKey: file ? "pending" : "",
      fileName: file?.name || "",
      fileMime: file?.type || "",
      reactions: [],
      pending: true,
      previewUrl,
    };
    setExtra((cur) => [...cur, pending]);
    saveChatPersist(persistKey, [pending], unsentIds);

    try {
      const result = await sendMessage(fd);
      if (!result || result.error) {
        setExtra((cur) => cur.filter((m) => m.id !== tempId));
        forgetPreview(previewUrl);
        return result;
      }
      if (result.ok && result.message) {
        const confirmed: GroupLine = {
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
        void fetch(`/api/chat/group?meetingId=${encodeURIComponent(meetingId)}`, { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { messages?: GroupLine[] } | null) => {
            const incoming = data?.messages;
            if (Array.isArray(incoming)) {
              setLive((cur) => mergeChatLines(incoming, cur, [], (m) => m.userId));
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
    <ChatDropZone className="chat-drop-zone-group">
      <div className="card chat-panel-card">
        <DmThread messageCount={lines.length}>
          {lines.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>
              No messages yet.
            </p>
          ) : (
            lines.map((msg) => {
              const removed = msg.authorRemoved;
              const copyText = !msg.unsent && !removed ? messageCopyText(msg) : "";
              const imageSrc = msg.previewUrl || (msg.fileKey && msg.fileKey !== "pending" ? `/api/files/${msg.id}` : "");
              return (
                <div key={msg.id} className="group-chat-row" style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  {removed ? (
                    <span
                      className="avatar removed-user-avatar"
                      style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}
                      aria-hidden
                    >
                      ?
                    </span>
                  ) : (
                    <Link href={`/profile/${msg.userId}`}>
                      <Avatar
                        user={{
                          id: msg.userId,
                          firstName: msg.firstName,
                          lastName: msg.lastName,
                          photoKey: msg.photoKey,
                        }}
                        style={{ width: 28, height: 28, fontSize: 10 }}
                      />
                    </Link>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <b style={{ fontSize: 13 }}>{removed ? "Removed buddy" : `${msg.firstName}:`}</b>
                      {msg.pending ? <span className="text-muted" style={{ fontSize: 11 }}>sending…</span> : null}
                      {!msg.unsent && !removed && !msg.pending && (copyText || msg.userId === meId) ? (
                        <div className="dm-bubble-actions">
                          {copyText ? <CopyMessageButton text={copyText} /> : null}
                          {msg.userId === meId ? (
                            <UnsendButton
                              kind="group"
                              messageId={msg.id}
                              meetingId={meetingId}
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
                    ) : removed ? (
                      <div className="msg-removed-user">Removed buddy</div>
                    ) : (
                      <>
                        {msg.text ? <div className="dm-text">{msg.text}</div> : null}
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
                            kind="group"
                            messageId={msg.id}
                            meId={meId}
                            initial={msg.reactions}
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </DmThread>
        <ChatCompose action={send} hidden={{ meetingId }} placeholder="Type a chat..." />
      </div>
    </ChatDropZone>
  );
}
