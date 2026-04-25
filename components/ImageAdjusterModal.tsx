"use client";

import { useEffect, useState } from "react";

type ImageAdjusterModalProps = {
  open: boolean;
  title: string;
  description?: string;
  file: File | null;
  shape?: "circle" | "rounded";
  outputSize?: number;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
};

type DragState = {
  x: number;
  y: number;
  startX: number;
  startY: number;
};

export default function ImageAdjusterModal({
  open,
  title,
  description,
  file,
  shape = "circle",
  outputSize = 512,
  onCancel,
  onConfirm,
}: ImageAdjusterModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.15);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    if (!file || !open) {
      setImageSrc(null);
      setImageEl(null);
      setZoom(1.15);
      setPosition({ x: 0, y: 0 });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setImageSrc(result);
    };
    reader.readAsDataURL(file);
  }, [file, open]);

  useEffect(() => {
    if (!imageSrc) return;

    const nextImage = new Image();
    nextImage.onload = () => {
      setImageEl(nextImage);
      setPosition({ x: 0, y: 0 });
      setZoom(1.15);
    };
    nextImage.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  const frameSize = 280;
  const scaledWidth = imageEl ? imageEl.width * zoom : frameSize;
  const scaledHeight = imageEl ? imageEl.height * zoom : frameSize;
  const minX = Math.min(0, (frameSize - scaledWidth) / 2);
  const maxX = Math.max(0, (scaledWidth - frameSize) / 2);
  const minY = Math.min(0, (frameSize - scaledHeight) / 2);
  const maxY = Math.max(0, (scaledHeight - frameSize) / 2);

  function clampPosition(nextX: number, nextY: number) {
    return {
      x: Math.min(maxX, Math.max(minX, nextX)),
      y: Math.min(maxY, Math.max(minY, nextY)),
    };
  }

  useEffect(() => {
    setPosition((prev) => clampPosition(prev.x, prev.y));
  }, [zoom, imageEl]);

  function beginDrag(clientX: number, clientY: number) {
    setDragState({
      x: position.x,
      y: position.y,
      startX: clientX,
      startY: clientY,
    });
  }

  function handlePointerMove(clientX: number, clientY: number) {
    if (!dragState) return;
    const dx = clientX - dragState.startX;
    const dy = clientY - dragState.startY;
    setPosition(clampPosition(dragState.x + dx, dragState.y + dy));
  }

  function exportImage() {
    if (!imageEl || !file) return;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else {
      const radius = outputSize * 0.16;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(outputSize - radius, 0);
      ctx.quadraticCurveTo(outputSize, 0, outputSize, radius);
      ctx.lineTo(outputSize, outputSize - radius);
      ctx.quadraticCurveTo(outputSize, outputSize, outputSize - radius, outputSize);
      ctx.lineTo(radius, outputSize);
      ctx.quadraticCurveTo(0, outputSize, 0, outputSize - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();
    }

    const scale = outputSize / frameSize;
    const drawWidth = imageEl.width * zoom * scale;
    const drawHeight = imageEl.height * zoom * scale;
    const offsetX = ((outputSize - drawWidth) / 2) + position.x * scale;
    const offsetY = ((outputSize - drawHeight) / 2) + position.y * scale;
    ctx.drawImage(imageEl, offsetX, offsetY, drawWidth, drawHeight);

    onConfirm(canvas.toDataURL(file.type || "image/png", 0.92));
  }

  if (!open || !file) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(3,6,23,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(94vw, 560px)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg,#111936,#0b1225)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          padding: 22,
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.58)", marginTop: 6 }}>
              {description || "Photo ko drag aur zoom karke face ya logo ko frame me set karen."}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            x
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginTop: 20 }}>
          <div
            onMouseDown={(event) => beginDrag(event.clientX, event.clientY)}
            onMouseMove={(event) => handlePointerMove(event.clientX, event.clientY)}
            onMouseUp={() => setDragState(null)}
            onMouseLeave={() => setDragState(null)}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (touch) beginDrag(touch.clientX, touch.clientY);
            }}
            onTouchMove={(event) => {
              event.preventDefault();
              const touch = event.touches[0];
              if (touch) handlePointerMove(touch.clientX, touch.clientY);
            }}
            onTouchEnd={() => setDragState(null)}
            style={{
              width: frameSize,
              height: frameSize,
              margin: "0 auto",
              borderRadius: shape === "circle" ? "50%" : 28,
              overflow: "hidden",
              position: "relative",
              background: "radial-gradient(circle at top, rgba(99,102,241,0.22), rgba(15,23,42,0.92))",
              border: "1px solid rgba(255,255,255,0.14)",
              cursor: dragState ? "grabbing" : "grab",
              touchAction: "none",
            }}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Adjust preview"
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: imageEl ? imageEl.width * zoom : "auto",
                  height: imageEl ? imageEl.height * zoom : "auto",
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: "2px solid rgba(255,255,255,0.18)",
                borderRadius: shape === "circle" ? "50%" : 28,
                boxShadow: "inset 0 0 0 999px rgba(2,6,23,0.10)",
                pointerEvents: "none",
              }}
            />
          </div>

          <div style={{ padding: "0 6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,0.54)" }}>
                Zoom
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>{zoom.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "11px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "rgba(255,255,255,0.8)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={exportImage}
            style={{
              padding: "11px 18px",
              borderRadius: 12,
              border: "1px solid rgba(99,102,241,0.4)",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Use This Photo
          </button>
        </div>
      </div>
    </div>
  );
}
