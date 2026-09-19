"use client";

import { useEffect, useState } from "react";
import { sendDm } from "@/app/actions";

export function DmCompose({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [pick, setPick] = useState(0);
  const [lightbox, setLightbox] = useState(false);

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

  return (
    <form action={sendDm} className="dm-form">
      <input type="hidden" name="userId" value={userId} />
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
        <input className="field" name="text" placeholder="Type a message..." style={{ margin: 0, flex: 1 }} />
        <label className="pill dm-attach">
          Attach
          <input
            key={pick}
            type="file"
            name="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.md,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <button className="btn" type="submit">
          Send
        </button>
      </div>
      {lightbox && preview ? (
        <div className="lightbox-backdrop" role="dialog" aria-modal="true" onClick={() => setLightbox(false)}>
          <button type="button" className="lightbox-x" onClick={() => setLightbox(false)} aria-label="Close">
            ×
          </button>
          <img className="lightbox-img" src={preview} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </form>
  );
}
