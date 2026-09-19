"use client";

import { useEffect, useState } from "react";

export function PhotoField({ src, fallback }: { src: string; fallback: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(src);
  const [clear, setClear] = useState(false);
  const [pick, setPick] = useState(0);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setClear(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function remove() {
    setFile(null);
    setPreview("");
    setClear(true);
    setPick((n) => n + 1);
  }

  const show = preview && !clear;

  return (
    <div className="photo-field">
      <div className={show ? "avatar avatar-lg avatar-pic" : "avatar avatar-lg"}>{show ? <img src={preview} alt="" /> : fallback}</div>
      <div className="photo-field-btns">
        <label className="pill" style={{ cursor: "pointer" }}>
          Upload photo
          <input
            key={pick}
            type="file"
            name="photo"
            accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {show ? (
          <button type="button" className="pill" onClick={remove}>
            Remove
          </button>
        ) : null}
      </div>
      {clear && !file ? <input type="hidden" name="clearPhoto" value="1" /> : null}
    </div>
  );
}
