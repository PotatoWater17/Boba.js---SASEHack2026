"use client";

import { useEffect, useState } from "react";
import { sendDm } from "@/app/actions";

export function DmCompose({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [pick, setPick] = useState(0);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clearFile() {
    setFile(null);
    setPick((n) => n + 1);
  }

  return (
    <form action={sendDm} className="dm-form" encType="multipart/form-data">
      <input type="hidden" name="userId" value={userId} />
      {file ? (
        <div className="dm-preview">
          {preview ? (
            <img src={preview} alt="" className="dm-preview-pic" />
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
    </form>
  );
}
