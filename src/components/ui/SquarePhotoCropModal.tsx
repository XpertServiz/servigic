"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_SIZE = 300;
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

export function SquarePhotoCropModal({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [mounted, setMounted] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard SSR-safe portal mount guard (document.body doesn't exist during SSR)
    setMounted(true);
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external resource (browser object URL) tied to the file prop; must create/revoke together, not derivable during render
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const cover = Math.max(VIEWPORT_SIZE / w, VIEWPORT_SIZE / h);
    setNatural({ w, h });
    setBaseScale(cover);
    setZoom(1);
    setOffset({ x: (VIEWPORT_SIZE - w * cover) / 2, y: (VIEWPORT_SIZE - h * cover) / 2 });
  }

  function clampOffset(x: number, y: number, currentZoom: number) {
    const displayScale = baseScale * currentZoom;
    const dispW = natural.w * displayScale;
    const dispH = natural.h * displayScale;
    const minX = Math.min(0, VIEWPORT_SIZE - dispW);
    const minY = Math.min(0, VIEWPORT_SIZE - dispH);
    return { x: Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: offset.x, startOffsetY: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.startOffsetX + dx, dragRef.current.startOffsetY + dy, zoom));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onZoomChange(newZoom: number) {
    setZoom(newZoom);
    setOffset((o) => clampOffset(o.x, o.y, newZoom));
  }

  function confirm() {
    const img = imgRef.current;
    if (!img) return;
    const displayScale = baseScale * zoom;
    const sourceX = -offset.x / displayScale;
    const sourceY = -offset.y / displayScale;
    const sourceSize = VIEWPORT_SIZE / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob((blob) => blob && onConfirm(blob), "image/jpeg", 0.88);
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-black/90 p-6">
      <p className="text-sm font-semibold text-white">Crop your photo — drag to reposition, zoom to fit</p>
      <div
        className="relative overflow-hidden rounded-full border-2 border-accent bg-black/40 touch-none"
        style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {imgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={imgUrl}
            alt="Crop preview"
            onLoad={onImageLoad}
            draggable={false}
            className="absolute left-0 top-0 select-none"
            style={{
              width: natural.w * baseScale * zoom,
              height: natural.h * baseScale * zoom,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        )}
      </div>
      <input
        type="range"
        min={1}
        max={MAX_ZOOM}
        step={0.05}
        value={zoom}
        onChange={(e) => onZoomChange(Number(e.target.value))}
        className="w-[300px] accent-accent"
      />
      <div className="flex gap-3">
        <button onClick={confirm} className="rounded-[10px] bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground">
          Use Photo
        </button>
        <button onClick={onCancel} className="rounded-[10px] border border-white/30 px-6 py-2.5 text-sm font-semibold text-white">
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}
