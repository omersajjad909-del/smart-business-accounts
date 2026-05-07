"use client";
import { useEffect, useState } from "react";

type ShiftSetting = {
  days: string[];
  startTime: string;
  endTime: string;
  graceMinutes: number;
  overtimeMinutes: number;
  warnMinutes: number;
  enabled: boolean;
};

type UserEntry = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  shift: ShiftSetting | null;
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS: Record<string, string> = { Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat", Sun: "Sun" };

const defaultShift = (): ShiftSetting => ({
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  startTime: "09:00",
  endTime: "17:00",
  graceMinutes: 10,
  overtimeMinutes: 0,
  warnMinutes: 10,
  enabled: true,
});

export default function ShiftControlPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [overtiming, setOvertiming] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ShiftSetting>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shift-settings");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(data.users || []);
      const d: Record<string, ShiftSetting> = {};
      (data.users || []).forEach((u: UserEntry) => {
        d[u.id] = u.shift ? { ...u.shift } : defaultShift();
      });
      setDrafts(d);
    } catch {
      showToast("Failed to load shift settings", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function updateDraft(userId: string, patch: Partial<ShiftSetting>) {
    setDrafts(prev => ({ ...prev, [userId]: { ...(prev[userId] || defaultShift()), ...patch } }));
  }

  function toggleDay(userId: string, day: string) {
    const curr = drafts[userId] || defaultShift();
    const days = curr.days.includes(day)
      ? curr.days.filter(d => d !== day)
      : [...curr.days, day];
    updateDraft(userId, { days });
  }

  async function save(userId: string) {
    const shift = drafts[userId];
    if (!shift) return;
    setSaving(userId);
    try {
      const res = await fetch("/api/admin/shift-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, shift }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Shift settings saved successfully");
      await load();
    } catch {
      showToast("Failed to save", false);
    } finally {
      setSaving(null);
    }
  }

  async function setOvertime(userId: string, minutes: number) {
    setOvertiming(userId);
    try {
      const res = await fetch("/api/admin/shift-settings/overtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, overtimeMinutes: minutes }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(minutes === 0 ? "Overtime cleared" : `+${minutes} min overtime applied`);
      await load();
    } catch {
      showToast("Failed to update overtime", false);
    } finally {
      setOvertiming(null);
    }
  }

  const nonAdminUsers = users.filter(u => u.role?.toUpperCase() !== "ADMIN");

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto", fontFamily: "'Outfit','Inter',sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 9999,
          background: toast.ok ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#dc2626,#ef4444)",
          color: "#fff", padding: "12px 20px", borderRadius: 12,
          fontWeight: 700, fontSize: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
          🕐 Shift Access Control
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Set working hours per employee. Login is blocked outside their scheduled shift.
          Admins can extend overtime at any time without restarting the session.
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          Loading users...
        </div>
      ) : nonAdminUsers.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 0",
          color: "var(--text-secondary)", fontSize: 14,
        }}>
          No staff users found. Add users from the Team section.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {nonAdminUsers.map(u => {
            const draft = drafts[u.id] || defaultShift();
            const isOpen = expanded === u.id;
            const hasShift = !!u.shift?.enabled;
            const ot = u.shift?.overtimeMinutes ?? 0;

            return (
              <div key={u.id} style={{
                background: "var(--panel-bg)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                overflow: "hidden",
              }}>
                {/* Card header — click to expand */}
                <div
                  onClick={() => setExpanded(isOpen ? null : u.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "16px 20px", cursor: "pointer",
                    background: isOpen ? "rgba(99,102,241,0.06)" : "transparent",
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0,
                  }}>
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {u.email} · <span style={{ textTransform: "capitalize" }}>{u.role?.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {hasShift ? (
                      <span style={{
                        background: "rgba(16,185,129,0.15)", color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.3)",
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>SHIFT ON</span>
                    ) : (
                      <span style={{
                        background: "rgba(148,163,184,0.12)", color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>NO SHIFT</span>
                    )}
                    {ot > 0 && (
                      <span style={{
                        background: "rgba(245,158,11,0.15)", color: "#f59e0b",
                        border: "1px solid rgba(245,158,11,0.3)",
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>+{ot}m OT</span>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"
                      style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>

                    {/* Enable toggle */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Enable Shift Control</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Block login outside scheduled hours</div>
                      </div>
                      <button
                        onClick={() => updateDraft(u.id, { enabled: !draft.enabled })}
                        style={{
                          width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                          background: draft.enabled ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(148,163,184,0.2)",
                          position: "relative", transition: "background 0.2s",
                        }}
                      >
                        <div style={{
                          position: "absolute", top: 3, left: draft.enabled ? 25 : 3,
                          width: 20, height: 20, borderRadius: "50%", background: "#fff",
                          transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                        }}/>
                      </button>
                    </div>

                    {draft.enabled && (
                      <>
                        {/* Days */}
                        <div style={{ paddingTop: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Working Days
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {ALL_DAYS.map(day => {
                              const active = draft.days.includes(day);
                              return (
                                <button
                                  key={day}
                                  onClick={() => toggleDay(u.id, day)}
                                  style={{
                                    padding: "6px 14px", borderRadius: 8, border: "1.5px solid",
                                    borderColor: active ? "#6366f1" : "var(--border)",
                                    background: active ? "rgba(99,102,241,0.15)" : "transparent",
                                    color: active ? "#818cf8" : "var(--text-secondary)",
                                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                                  }}
                                >{DAY_LABELS[day]}</button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Times */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, paddingTop: 16 }}>
                          {[
                            { label: "Start Time", key: "startTime" as const },
                            { label: "End Time", key: "endTime" as const },
                            { label: "Grace (mins)", key: "graceMinutes" as const, type: "number" },
                            { label: "Warn Before End (mins)", key: "warnMinutes" as const, type: "number" },
                          ].map(({ label, key, type }) => (
                            <div key={key}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                              <input
                                type={type === "number" ? "number" : "time"}
                                value={draft[key] as string | number}
                                min={type === "number" ? 0 : undefined}
                                max={type === "number" ? 120 : undefined}
                                onChange={e => updateDraft(u.id, { [key]: type === "number" ? Number(e.target.value) : e.target.value })}
                                style={{
                                  width: "100%", padding: "9px 12px", borderRadius: 10,
                                  border: "1.5px solid var(--border)", background: "var(--input-bg)",
                                  color: "var(--text-primary)", fontSize: 14, fontWeight: 600,
                                  outline: "none", boxSizing: "border-box",
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Overtime section */}
                        <div style={{
                          marginTop: 18, background: "rgba(245,158,11,0.08)",
                          border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "14px 16px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#f59e0b" }}>⏰ Overtime Extension</div>
                              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                                Current: <strong style={{ color: ot > 0 ? "#f59e0b" : "var(--text-secondary)" }}>
                                  {ot > 0 ? `+${ot} minutes` : "None"}
                                </strong>
                              </div>
                            </div>
                            {ot > 0 && (
                              <button
                                onClick={() => setOvertime(u.id, 0)}
                                disabled={overtiming === u.id}
                                style={{
                                  padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)",
                                  background: "rgba(239,68,68,0.1)", color: "#f87171",
                                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                                }}
                              >Clear OT</button>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            {[30, 60, 90, 120].map(mins => (
                              <button
                                key={mins}
                                onClick={() => setOvertime(u.id, mins)}
                                disabled={overtiming === u.id}
                                style={{
                                  flex: 1, padding: "8px 4px", borderRadius: 9, border: "1.5px solid rgba(245,158,11,0.4)",
                                  background: ot === mins ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.08)",
                                  color: "#f59e0b", fontWeight: 800, fontSize: 13, cursor: "pointer",
                                }}
                              >+{mins}m</button>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.5 }}>
                            Overtime is applied immediately — user will be auto-logged out after the extended time.
                          </div>
                        </div>
                      </>
                    )}

                    {/* Save button */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                      <button
                        onClick={() => save(u.id)}
                        disabled={saving === u.id}
                        style={{
                          padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          color: "#fff", fontWeight: 700, fontSize: 14,
                          opacity: saving === u.id ? 0.6 : 1,
                        }}
                      >
                        {saving === u.id ? "Saving..." : "Save Shift Settings"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Blocked login log section */}
      <BlockedLoginLog />
    </div>
  );
}

type BlockedLog = { createdAt: string; details: string; userId: string };

function BlockedLoginLog() {
  const [logs, setLogs] = useState<BlockedLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  async function fetchLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/logs?action=LOGIN_BLOCKED_SHIFT");
      if (res.ok) {
        const d = await res.json();
        setLogs(d.rows || []);
        setShowLogs(true);
      }
    } catch {} finally {
      setLoadingLogs(false);
    }
  }

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
          📋 Blocked Login Attempts
        </div>
        <button
          onClick={fetchLogs}
          disabled={loadingLogs}
          style={{
            padding: "8px 18px", borderRadius: 9, border: "1px solid var(--border)",
            background: "var(--panel-bg)", color: "var(--text-secondary)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          {loadingLogs ? "Loading..." : "Load Logs"}
        </button>
      </div>

      {showLogs && (
        logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: 14 }}>
            No blocked login attempts found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {logs.map((log, i) => {
              let details: any = {};
              try { details = JSON.parse(log.details || "{}"); } catch {}
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px", borderRadius: 12,
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                }}>
                  <span style={{ fontSize: 18 }}>⛔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      User: {log.userId}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {details.day} at {details.time} · Shift: {details.shiftStart}–{details.shiftEnd}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {new Date(log.createdAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
