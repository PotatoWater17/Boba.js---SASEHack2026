"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CHAT_ATTACH_ACCEPT, validChatAttachFile } from "@/chat-attach";
import { useRegisterChatDrop } from "@/chat-drop";

export function ChatCompose({
  action,
  hidden,
  placeholder = "Type a message...",
}: {
  action: (formData: FormData) => void;
  hidden: Record<string, string>;
  placeholder?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [pick, setPick] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rejectHint, setRejectHint] = useState("");
  const [sending, setSending] = useState(false);

  const attachFile = useCallback((next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    if (!validChatAttachFile(next)) {
      setRejectHint("That file type isn't allowed.");
      window.setTimeout(() => setRejectHint(""), 4000);
      return;
    }
    setRejectHint("");
    setFile(next);
  }, []);

  useRegisterChatDrop(attachFile);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview("");
      setLightbox(false);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  function clearFile() {
    setFile(null);
    setPick((n) => n + 1);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const text = String(fd.get("text") || "").trim();
    if (file) fd.set("file", file);
    const raw = fd.get("file");
    if (!text && !(raw instanceof File && raw.size > 0)) return;

    setSending(true);
    try {
      await action(fd);
    } catch {
      // server actions use redirect() which throws; parent remounts compose on success via key
    } finally {
      setSending(false);
    }
  }

  const lightboxNode =
    lightbox && preview && mounted ? (
      <div className="lightbox-backdrop" role="dialog" aria-modal="true" onClick={() => setLightbox(false)}>
        <button type="button" className="lightbox-x" onClick={() => setLightbox(false)} aria-label="Close">
          ×
        </button>
        <img className="lightbox-img" src={preview} alt="" onClick={(e) => e.stopPropagation()} />
      </div>
    ) : null;

  return (
    <>
      <form className="dm-form" onSubmit={onSubmit} autoComplete="off">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {rejectHint ? <p className="err chat-attach-hint">{rejectHint}</p> : null}
        {file ? (
          <div className="dm-preview">
            {preview ? (
              <button type="button" className="dm-preview-pic-btn" onClick={() => setLightbox(true)} aria-label="Preview image">
                <img src={preview} alt="" className="dm-preview-pic" />
              </button>
            ) : (
              <span className="dm-preview-icon">📎</span>
            )}
            <span className="dm-preview-name">{file.name}</span>
            <button type="button" className="dm-preview-x" onClick={clearFile} aria-label="Remove file">
              ×
            </button>
          </div>
        ) : null}
        <div className="dm-compose">
          <input
            className="field chat-compose-input"
            name="text"
            type="text"
            placeholder={placeholder}
            style={{ margin: 0, flex: 1 }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            readOnly
            onFocus={(e) => {
              e.currentTarget.readOnly = false;
            }}
            onBlur={(e) => {
              e.currentTarget.readOnly = true;
            }}
          />
          <label className="pill dm-attach">
            Attach
            <input
              key={pick}
              type="file"
              name="file"
              accept={CHAT_ATTACH_ACCEPT}
              onChange={(e) => attachFile(e.target.files?.[0] || null)}
            />
          </label>
          <button className="btn" type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
      {lightboxNode && mounted ? createPortal(lightboxNode, document.body) : null}
    </>
  );
}
