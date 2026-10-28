"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A camera popup that works wherever the browser has a camera.
 *
 * `<input capture="environment">` only opens the camera on a phone; a desktop
 * browser ignores it and shows the file picker, which is what "Take photo"
 * did on a laptop. This asks for the camera itself instead. It prefers the back
 * camera on a phone, and where no camera can be opened (permission refused, no
 * device, a page not served over https) it says so and offers the file picker,
 * so the button never dead-ends.
 */
export default function CameraCapture({
  open,
  onClose,
  onCapture,
  title = "Take photo",
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setReady(false);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser cannot open the camera here.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e: any) {
        setError(
          e?.name === "NotAllowedError"
            ? "Camera permission was refused. Allow the camera for this site, or choose a file instead."
            : e?.name === "NotFoundError"
            ? "No camera was found on this device. Choose a file instead."
            : "Could not open the camera. Choose a file instead.",
        );
      }
    })();
    return () => { cancelled = true; stop(); };
  }, [open]);

  if (!open) return null;

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    canvas.toBlob(b => {
      if (!b) return;
      const file = new File([b], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      stop();
      onCapture(file);
      onClose();
    }, "image/jpeg", 0.92);
  };

  const close = () => { stop(); onClose(); };

  const btn: React.CSSProperties = { border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(720px, 100%)", background: "#0c0e1a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, overflow: "hidden", color: "#fff" }}>
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <strong style={{ fontSize: 14 }}>{title}</strong>
          <button onClick={close} style={{ ...btn, background: "transparent", color: "#fff", padding: "4px 10px", fontSize: 18 }}>×</button>
        </div>
        {error ? (
          <div style={{ padding: "28px 20px", textAlign: "center", fontSize: 13, lineHeight: 1.7 }}>{error}</div>
        ) : (
          <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", maxHeight: "65vh", background: "#000", display: "block", objectFit: "contain" }} />
        )}
        <div style={{ padding: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {!error && <button onClick={snap} disabled={!ready} style={{ ...btn, background: "#6366f1", color: "#fff", opacity: ready ? 1 : 0.5 }}>📸 Capture</button>}
          <button onClick={() => fileRef.current?.click()} style={{ ...btn, background: "rgba(255,255,255,.08)", color: "#fff" }}>🖼 Choose a file</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { stop(); onCapture(f); onClose(); } }} />
        </div>
      </div>
    </div>
  );
}
