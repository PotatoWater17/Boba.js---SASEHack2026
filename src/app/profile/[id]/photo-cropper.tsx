"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT = 280;
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

type Point = { x: number; y: number };

function clampPosition(pos: Point, scale: number, width: number, height: number): Point {
  const scaledW = width * scale;
  const scaledH = height * scale;
  const maxX = Math.max(0, (scaledW - VIEWPORT) / 2);
  const maxY = Math.max(0, (scaledH - VIEWPORT) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, pos.x)),
    y: Math.min(maxY, Math.max(-maxY, pos.y)),
  };
}

async function cropToFile(image: HTMLImageElement, scale: number, position: Point) {
  const scaledW = image.naturalWidth * scale;
  const scaledH = image.naturalHeight * scale;
  const imgLeft = VIEWPORT / 2 + position.x - scaledW / 2;
  const imgTop = VIEWPORT / 2 + position.y - scaledH / 2;

  const sourceX = Math.max(0, -imgLeft / scale);
  const sourceY = Math.max(0, -imgTop / scale);
  const sourceW = Math.min(image.naturalWidth - sourceX, VIEWPORT / scale);
  const sourceH = Math.min(image.naturalHeight - sourceY, VIEWPORT / scale);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not export image"))),
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export function PhotoCropper({
  imageSrc,
  onDone,
  onCancel,
}: {
  imageSrc: string;
  onDone: (file: File) => void;
  onCancel: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [mediaSize, setMediaSize] = useState<{ w: number; h: number } | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: Point } | null>(null);

  const scale = minScale * zoom;

  const clamped = useCallback(
    (pos: Point, nextScale = scale) => {
      const img = imageRef.current;
      if (!img) return pos;
      return clampPosition(pos, nextScale, img.naturalWidth, img.naturalHeight);
    },
    [scale],
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function onImageLoad() {
    const img = imageRef.current;
    if (!img) return;
    const cover = Math.max(VIEWPORT / img.naturalWidth, VIEWPORT / img.naturalHeight);
    setMediaSize({ w: img.naturalWidth, h: img.naturalHeight });
    setMinScale(cover);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setReady(true);
  }

  function onZoomChange(nextZoom: number) {
    const img = imageRef.current;
    if (!img) return;
    const nextScale = minScale * nextZoom;
    setZoom(nextZoom);
    setPosition((pos) => clampPosition(pos, nextScale, img.naturalWidth, img.naturalHeight));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!ready) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: position };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const img = imageRef.current;
    if (!drag || !img) return;
    const next = clampPosition(
      {
        x: drag.origin.x + (e.clientX - drag.startX),
        y: drag.origin.y + (e.clientY - drag.startY),
      },
      scale,
      img.naturalWidth,
      img.naturalHeight,
    );
    setPosition(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  async function apply() {
    const img = imageRef.current;
    if (!img || !ready || busy) return;
    setBusy(true);
    try {
      const file = await cropToFile(img, scale, clamped(position));
      onDone(file);
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop photo-crop-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Crop photo"
      onClick={onCancel}
    >
      <div className="modal photo-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-text">
            <h2 className="modal-title">Adjust photo</h2>
            <p className="modal-description">Drag to reposition. Use the slider to zoom in or out.</p>
          </div>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div
          className={`photo-crop-viewport${dragging ? " dragging" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt=""
            draggable={false}
            className="photo-crop-image"
            style={
              mediaSize
                ? {
                    width: mediaSize.w * scale,
                    height: mediaSize.h * scale,
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                    opacity: ready ? 1 : 0,
                  }
                : undefined
            }
            onLoad={onImageLoad}
          />
          <div className="photo-crop-ring" aria-hidden="true" />
        </div>
        <label className="photo-crop-zoom">
          Zoom
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
          />
        </label>
        <div className="photo-crop-actions">
          <button type="button" className="btn-ghost action-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn action-btn" onClick={apply} disabled={!ready || busy}>
            {busy ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
