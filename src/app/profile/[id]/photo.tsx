"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoCropper } from "./photo-cropper";

const ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp";

export function PhotoField({ src, fallback }: { src: string; fallback: string }) {
  const [preview, setPreview] = useState(src);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [clear, setClear] = useState(false);
  const [pick, setPick] = useState(0);

  const submitInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setPreview(src);
    setCroppedFile(null);
    setClear(false);
  }, [src]);

  useEffect(() => {
    const input = submitInputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    if (croppedFile) dt.items.add(croppedFile);
    input.files = dt.files;
  }, [croppedFile]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  function revokePreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
  }

  function onCropDone(file: File) {
    revokePreviewUrl();
    previewUrlRef.current = URL.createObjectURL(file);
    setPreview(previewUrlRef.current);
    setCroppedFile(file);
    setClear(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPick((n) => n + 1);
  }

  function onCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPick((n) => n + 1);
  }

  function remove() {
    revokePreviewUrl();
    setCroppedFile(null);
    setPreview("");
    setClear(true);
    setPick((n) => n + 1);
  }

  const show = preview && !clear;

  return (
    <>
      <div className="photo-field">
        <div className={show ? "avatar avatar-lg avatar-pic" : "avatar avatar-lg"}>
          {show ? <img src={preview} alt="" /> : fallback}
        </div>
        <div className="photo-field-btns">
          <label className="pill" style={{ cursor: "pointer" }}>
            Upload photo
            <input key={pick} type="file" accept={ACCEPT} hidden onChange={onPick} />
          </label>
          {show ? (
            <button type="button" className="pill" onClick={remove}>
              Remove
            </button>
          ) : null}
        </div>
        <input ref={submitInputRef} type="file" name="photo" hidden />
        {clear && !croppedFile ? <input type="hidden" name="clearPhoto" value="1" /> : null}
      </div>
      {cropSrc ? <PhotoCropper imageSrc={cropSrc} onDone={onCropDone} onCancel={onCropCancel} /> : null}
    </>
  );
}
