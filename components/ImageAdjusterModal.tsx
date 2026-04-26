"use client";

import { useEffect, useRef, useState } from "react";

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
  const frameSize = 280;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1.15);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Refs so window handlers always see latest values without re-registering
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const boundsRef = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  const zoomRef = useRef(zoom);
  const imageElRef = useRef<HTMLImageElement | null>(null);

  // Sync refs
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { imageElRef.current = imageEl; }, [imageEl]);

  // Reset when file/open changes
  useEffect(() => {
    if (!file || !open) {
      setImageSrc(null);
      setImageEl(null);
      setZoom(1.15);
      setPosition({ x: 0, y: 0 });
      dragRef.current = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
  }, [file, open]);

  // Load image element
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      setImageEl(img);
      setPosition({ x: 0, y: 0 });
      setZoom(1.15);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Recompute bounds whenever zoom or imageEl changes
  useEffect(() => {
    const el = imageElRef.current;
    const z = zoomRef.current;
    const sw = el ? el.width * z : frameSize;
    const sh = el ? el.height * z : frameSize;
    boundsRef.current = {
      minX: Math.min(0, (frameSize - sw) / 2),
      maxX: Math.max(0, (sw - frameSize) / 2),
      minY: Math.min(0, (frameSize - sh) / 2),
      maxY: Math.max(0, (sh - frameSize) / 2),
    };
    // Clamp current position into new bounds
    setPosition((prev) => ({
      x: Math.min(boundsRef.current.maxX, Math.max(boundsRef.current.minX, prev.x)),
      y: Math.min(boundsRef.current.maxY, Math.max(boundsRef.current.minY, prev.y)),
    }));
  }, [zoom, imageEl]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  // Window-level drag handlers — registered once, read refs
  useEffect(() => {
    function clamp(x: number, y: number) {
      const { minX, maxX, minY, maxY } = boundsRef.current;
      return {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
      };
    }

    function move(clientX: number, clientY: number) {
      if (!dragRef.current) return;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setPosition(clamp(dragRef.current.origX + dx, dragRef.current.origY + dy));
    }

    function up() {
      dragRef.current = null;
      setIsDragging(false);
    }

    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onMouseUp = () => up();
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY);
    };
    const onTouchEnd = () => up();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []); // empty — handlers read all state via refs

  function beginDrag(clientX: number, clientY: number) {
    dragRef.current = { startX: clientX, startY: clientY, origX: position.x, origY: position.y };
    setIsDragging(true);
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
      const r = outputSize * 0.16;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(outputSize - r, 0);
      ctx.quadraticCurveTo(outputSize, 0, outputSize, r);
      ctx.lineTo(outputSize, outputSize - r);
      ctx.quadraticCurveTo(outputSize, outputSize, outputSize - r, outputSize);
      ctx.lineTo(r, outputSize);
      ctx.quadraticCurveTo(0, outputSize, 0, outputSize - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.clip();
    }

    const scale = outputSize / frameSize;
    const drawW = imageEl.width * zoom * scale;
    const drawH = imageEl.height * zoom * scale;
    const offsetX = (outputSize - drawW) / 2 + position.x * scale;
    const offsetY = (outputSize - drawH) / 2 + position.y * scale;
    ctx.drawImage(imageEl, offsetX, offsetY, drawW, drawH);

    onConfirm(canvas.toDataURL(file.type || "image/png", 0.92));
  }

  if (!open || !file) return null;

  const scaledW = imageEl ? imageEl.width * zoom : frameSize;
  const scaledH = imageEl ? imageEl.height * zoom : frameSize;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(3,6,23,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(94vw, 520px)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg,#111936,#0b1225)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          padding: "22px 22px 20px",
          color: "white",
          userSelect: "none",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>
              {description || "Photo ko drag karein aur zoom karein — jo hissa chahiyein center mein layen."}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: 32, height: 32, borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer", fontSize: 16, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Crop frame */}
        <div style={{ position: "relative", width: frameSize, height: frameSize, margin: "0 auto 18px" }}>
          {/* The actual clip area */}
          <div
            onMouseDown={(e) => { e.preventDefault(); beginDrag(e.clientX, e.clientY); }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) beginDrag(t.clientX, t.clientY);
            }}
            style={{
              width: frameSize,
              height: frameSize,
              borderRadius: shape === "circle" ? "50%" : 24,
              overflow: "hidden",
              position: "relative",
              background: "#0a0f24",
              cursor: isDragging ? "grabbing" : "grab",
              touchAction: "none",
              border: "2px solid rgba(99,102,241,0.5)",
              boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {imageSrc && (
              <img
                src={imageSrc}
                alt="crop preview"
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: scaledW,
                  height: scaledH,
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          {/* Hint overlay shown while not dragging */}
          {!isDragging && imageSrc && (
            <div style={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.55)",
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 10,
              color: "rgba(255,255,255,0.6)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}>
              drag karein ↕↔
            </div>
          )}
        </div>

        {/* Zoom slider */}
        <div style={{ padding: "0 4px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
              Zoom
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{zoom.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#6366f1" }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 18px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            منسوخ
          </button>
          <button
            type="button"
            onClick={exportImage}
            style={{
              padding: "10px 20px", borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "white",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
            }}
          >
            یہ فوٹو استعمال کریں
          </button>
        </div>
      </div>
    </div>
  );
}
