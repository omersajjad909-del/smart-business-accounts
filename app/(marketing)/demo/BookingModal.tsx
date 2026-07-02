"use client";
import { useEffect, useMemo, useState } from "react";

const FONT = "'Outfit','Inter',sans-serif";

type Slot = { start: string; end: string; label: string; available: boolean };

function pad(n: number) { return n.toString().padStart(2, "0"); }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function shortDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export default function BookingModal({
  open,
  onClose,
  businessType,
  businessLabel,
  color,
  gradient,
}: {
  open: boolean;
  onClose: () => void;
  businessType: string;
  businessLabel: string;
  color: string;
  gradient: string;
}) {
  const [date, setDate] = useState(() => ymd(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<null | { id: string; accessToken: string; slotStart: string; slotEnd: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => {
    const list: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  useEffect(() => {
    if (!open) return;
    setConfirmed(null);
    setError(null);
    setSelectedSlot(null);
  }, [open, businessType]);

  useEffect(() => {
    if (!open || confirmed) return;
    let alive = true;
    setSlotsLoading(true);
    setSelectedSlot(null);
    fetch(`/api/demo/slots?businessType=${encodeURIComponent(businessType)}&date=${date}`)
      .then(r => r.json())
      .then(d => { if (alive) setSlots(d.slots || []); })
      .catch(() => { if (alive) setSlots([]); })
      .finally(() => { if (alive) setSlotsLoading(false); });
    return () => { alive = false; };
  }, [open, businessType, date, confirmed]);

  async function submitBooking() {
    if (!selectedSlot) { setError("Please pick a time slot"); return; }
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      return;
    }
    setError(null);
    setBooking(true);
    try {
      const r = await fetch("/api/demo/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType,
          slotStart: selectedSlot.start,
          ...form,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Booking failed");
      } else {
        setConfirmed(d.booking);
      }
    } catch (e: any) {
      setError(e.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  if (!open) return null;

  const startLink = confirmed
    ? `/demo/start?token=${confirmed.accessToken}`
    : "";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000, background: "rgba(4,6,20,.78)",
        backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 20, fontFamily: FONT,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg,#0b0e28 0%,#0a0d24 100%)",
          border: `1px solid ${color}30`,
          borderRadius: 24, width: "100%", maxWidth: 640, maxHeight: "90vh",
          overflow: "auto", boxShadow: `0 30px 80px ${color}20`, color: "white",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>
              Book a Live Demo
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.4 }}>{businessLabel}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>
              30-minute session · Test data will be reset after
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.08)", color: "white", cursor: "pointer",
            fontSize: 16, fontWeight: 700,
          }}>✕</button>
        </div>

        {confirmed ? (
          <div style={{ padding: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16, boxShadow: `0 12px 30px ${color}40` }}>
              ✓
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>You&apos;re booked!</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 20 }}>
              Your live demo for <strong style={{ color: "white" }}>{businessLabel}</strong> is scheduled for{" "}
              <strong style={{ color }}>
                {new Date(confirmed.slotStart).toLocaleString(undefined, {
                  weekday: "long", day: "numeric", month: "long",
                  hour: "2-digit", minute: "2-digit",
                })}
              </strong>{" "}
              — {new Date(confirmed.slotEnd).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}.
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", fontSize: 12.5, color: "rgba(255,255,255,.65)", lineHeight: 1.7, marginBottom: 20 }}>
              Save the access link below — you&apos;ll use it at your booked time to enter the demo workspace. The demo automatically ends after 30 minutes and all test data is deleted.
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, color: "rgba(255,255,255,.7)", fontFamily: "monospace", wordBreak: "break-all", marginBottom: 16 }}>
              {typeof window !== "undefined" ? `${window.location.origin}${startLink}` : startLink}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${startLink}`);
                }}
                style={{
                  flex: 1, padding: "12px 20px", borderRadius: 12,
                  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                  color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700,
                }}
              >
                📋 Copy Link
              </button>
              <a
                href={startLink}
                style={{
                  flex: 1, padding: "12px 20px", borderRadius: 12,
                  background: gradient, color: "white", cursor: "pointer",
                  fontSize: 13, fontWeight: 800, textDecoration: "none", textAlign: "center",
                  boxShadow: `0 10px 26px ${color}35`,
                }}
              >
                Open Demo →
              </a>
            </div>
          </div>
        ) : (
          <div style={{ padding: 28 }}>
            {/* Date strip */}
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>
              Pick a date
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
              {dates.map(d => {
                const value = ymd(d);
                const active = value === date;
                return (
                  <button
                    key={value}
                    onClick={() => setDate(value)}
                    style={{
                      flexShrink: 0, padding: "10px 14px", borderRadius: 12,
                      background: active ? `${color}20` : "rgba(255,255,255,.04)",
                      border: `1px solid ${active ? color : "rgba(255,255,255,.08)"}`,
                      color: active ? color : "rgba(255,255,255,.75)",
                      cursor: "pointer", fontSize: 12, fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {shortDate(d)}
                  </button>
                );
              })}
            </div>

            {/* Slots */}
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>
              Pick a 30-minute slot
            </div>
            {slotsLoading ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,.35)", fontSize: 13 }}>
                Loading slots…
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8, marginBottom: 22 }}>
                {slots.length === 0 && (
                  <div style={{ gridColumn: "1/-1", padding: "20px", textAlign: "center", color: "rgba(255,255,255,.35)", fontSize: 13 }}>
                    No slots for this date. Try another.
                  </div>
                )}
                {slots.map(s => {
                  const active = selectedSlot?.start === s.start;
                  return (
                    <button
                      key={s.start}
                      onClick={() => s.available && setSelectedSlot(s)}
                      disabled={!s.available}
                      style={{
                        padding: "10px 8px", borderRadius: 10,
                        background: active
                          ? `${color}25`
                          : s.available ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.02)",
                        border: `1px solid ${active ? color : s.available ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)"}`,
                        color: active ? color : s.available ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.2)",
                        cursor: s.available ? "pointer" : "not-allowed",
                        fontSize: 12, fontWeight: 700,
                        textDecoration: s.available ? "none" : "line-through",
                      }}
                    >
                      {s.label.split(" - ")[0]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Form */}
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>
              Your details
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {(["name", "email", "phone", "company"] as const).map(k => (
                <input
                  key={k}
                  placeholder={
                    k === "name" ? "Full name *"
                    : k === "email" ? "Email *"
                    : k === "phone" ? "Phone (optional)"
                    : "Company (optional)"
                  }
                  value={form[k]}
                  onChange={e => setForm({ ...form, [k]: e.target.value })}
                  style={{
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.08)",
                    color: "white", fontSize: 13, outline: "none",
                    fontFamily: FONT,
                  }}
                />
              ))}
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12.5, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button
              onClick={submitBooking}
              disabled={!selectedSlot || booking}
              style={{
                width: "100%", padding: "14px 20px", borderRadius: 14,
                background: selectedSlot && !booking ? gradient : "rgba(255,255,255,.08)",
                color: selectedSlot && !booking ? "white" : "rgba(255,255,255,.4)",
                cursor: selectedSlot && !booking ? "pointer" : "not-allowed",
                border: "none", fontSize: 14, fontWeight: 800,
                boxShadow: selectedSlot && !booking ? `0 12px 30px ${color}35` : "none",
              }}
            >
              {booking ? "Booking…" : selectedSlot ? `Book ${selectedSlot.label.split(" - ")[0]} slot` : "Pick a slot to continue"}
            </button>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
              You&apos;ll get an instant access link. The demo runs for exactly 30 minutes and all test data resets afterwards.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
