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
  const frameSize = 270;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const boundsRef = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  const zoomRef = useRef(zoom);
  const minZoomRef = useRef(minZoom);
  const imageElRef = useRef<HTMLImageElement | null>(null);
  const pinchRef = useRef<{ dist: number; origZoom: number } | null>(null);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { minZoomRef.current = minZoom; }, [minZoom]);
  useEffect(() => { imageElRef.current = imageEl; }, [imageEl]);

  // Reset when file/open changes
  useEffect(() => {
    if (!file || !open) {
      setImageSrc(null);
      setImageEl(null);
      setZoom(1);
      setMinZoom(1);
      setPosition({ x: 0, y: 0 });
      dragRef.current = null;
      pinchRef.current = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
  }, [file, open]);

  // Load image — compute cover zoom so the frame is always filled
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      // Cover zoom: minimum zoom so image fills the frame on both axes
      const cz = Math.max(frameSize / img.width, frameSize / img.height);
      setMinZoom(cz);
      zoomRef.current = cz;
      setZoom(cz);
      setImageEl(img);
      setPosition({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Recompute pan bounds whenever zoom or imageEl changes
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

  // Window-level drag + pinch handlers — read all state via refs
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

    function pinchDist(touches: TouchList) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onMouseUp = () => up();

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && pinchRef.current) {
        const dist = pinchDist(e.touches);
        const scale = dist / pinchRef.current.dist;
        const minZ = minZoomRef.current;
        const newZoom = Math.min(minZ * 4, Math.max(minZ, pinchRef.current.origZoom * scale));
        zoomRef.current = newZoom;
        setZoom(newZoom);
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        if (t) move(t.clientX, t.clientY);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length === 0) up();
    };

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
  }, []);

  function beginDrag(clientX: number, clientY: number) {
    dragRef.current = { startX: clientX, startY: clientY, origX: position.x, origY: position.y };
    setIsDragging(true);
  }

  function beginPinch(touches: React.TouchList) {
    if (touches.length >= 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pinchRef.current = { dist, origZoom: zoomRef.current };
    }
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
  const maxZoom = minZoom * 4;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(3,6,23,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
      }}
    >
      <div
        style={{
          width: "min(96vw, 360px)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg,#111936,#0b1225)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          color: "white",
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 14px 12px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>{title}</div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Crop frame */}
        <div style={{ display: "flex", justifyContent: "center", padding: "0 14px", marginBottom: 14 }}>
          <div
            onMouseDown={(e) => { e.preventDefault(); beginDrag(e.clientX, e.clientY); }}
            onTouchStart={(e) => {
              if (e.touches.length >= 2) {
                beginPinch(e.touches);
              } else {
                const t = e.touches[0];
                if (t) beginDrag(t.clientX, t.clientY);
              }
            }}
            style={{
              width: frameSize,
              height: frameSize,
              borderRadius: shape === "circle" ? "50%" : 20,
              overflow: "hidden",
              position: "relative",
              background: "#060c1e",
              cursor: isDragging ? "grabbing" : "grab",
              touchAction: "none",
              border: "2.5px solid rgba(99,102,241,0.65)",
              boxShadow: "0 0 0 5px rgba(99,102,241,0.12), 0 12px 40px rgba(0,0,0,0.5)",
              flexShrink: 0,
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
            {/* Hint */}
            {!isDragging && imageSrc && (
              <div style={{
                position: "absolute", bottom: 8, left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
                borderRadius: 20, padding: "4px 12px",
                fontSize: 10, color: "rgba(255,255,255,0.7)",
                whiteSpace: "nowrap", pointerEvents: "none",
              }}>
                drag · pinch to zoom
              </div>
            )}
          </div>
        </div>

        {/* Zoom slider */}
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
              Zoom
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
              {(zoom / minZoom).toFixed(1)}×
            </span>
          </div>
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={minZoom * 0.005}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#6366f1" }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, padding: "0 14px 14px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: "12px", borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.65)",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={exportImage}
            style={{
              flex: 2, padding: "12px", borderRadius: 11,
              border: "none",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "white",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 18px rgba(99,102,241,0.45)",
            }}
          >
            Use This Photo
          </button>
        </div>
      </div>
    </div>
  );
}
