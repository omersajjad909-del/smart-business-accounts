"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { fmtDate, todayIso } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";

const ff = "'Outfit','Inter',sans-serif";
const ACCENT = "#818cf8";

const BRANDS = ["ZKTECO", "ESSL", "HIKVISION", "SUPREMA", "ANVIZ", "OTHER"];
const MODES: { value: string; label: string; hint: string }[] = [
  { value: "BRIDGE", label: "Bridge agent", hint: "Office PC machine se logs uthata hai — har device par chalta hai" },
  { value: "PUSH", label: "Device push (ADMS)", hint: "Machine khud server ko bhejti hai — naye ZKTeco models" },
  { value: "IMPORT", label: "File import only", hint: "Vendor software se export karke yahan upload" },
];

interface Device {
  id: string;
  name: string;
  serialNumber: string;
  brand: string;
  mode: string;
  location: string | null;
  ipAddress: string | null;
  apiKeyPrefix: string;
  tzOffsetMin: number;
  isActive: boolean;
  lastSeenAt: string | null;
  lastPunchAt: string | null;
  _count?: { punches: number };
}

interface MappingEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  biometricId: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
}

interface Orphan {
  biometricId: string;
  punches: number;
  lastSeen: string | null;
}

interface Punch {
  id: string;
  biometricId: string;
  punchTime: string;
  direction: string;
  verifyMode: string | null;
  source: string;
  processed: boolean;
  device: { id: string; name: string } | null;
  employee: { id: string; firstName: string; lastName: string } | null;
}

interface Settings {
  graceMinutes: number;
  halfDayHours: number;
  dedupeMinutes: number;
  autoAbsent: boolean;
  nightShiftCutoffHour: number;
}

function authH() {
  const u = getCurrentUser();
  return {
    "Content-Type": "application/json",
    ...(u?.role ? { "x-user-role": u.role } : {}),
    ...(u?.id ? { "x-user-id": u.id } : {}),
    ...(u?.companyId ? { "x-company-id": u.companyId } : {}),
  };
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function relative(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "never";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

/* ── shared inline styles ──────────────────────────────────────────────── */

const card: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--panel-bg)",
  marginBottom: 18,
  overflow: "hidden",
};

const cardHead: React.CSSProperties = {
  padding: "14px 18px",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const stepBadge: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: `${ACCENT}1f`,
  border: `1px solid ${ACCENT}55`,
  color: ACCENT,
  fontSize: 12,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--app-bg)",
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: ff,
};

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  display: "block",
  marginBottom: 5,
};

const btn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${ACCENT}66`,
  background: `${ACCENT}1a`,
  color: ACCENT,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: ff,
};

const btnGhost: React.CSSProperties = {
  ...btn,
  border: "1px solid var(--border)",
  background: "var(--app-bg)",
  color: "var(--text-primary)",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "9px 12px",
  fontSize: 10.5,
  fontWeight: 800,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: ".05em",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "9px 12px",
  fontSize: 12.5,
  color: "var(--text-primary)",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle",
};

function Section({
  step,
  title,
  subtitle,
  action,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={card}>
      <div style={cardHead}>
        <div style={stepBadge}>{step}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--text-primary)" }}>{title}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{subtitle}</p>
        </div>
        {action}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

/* ── page ───────────────────────────────────────────────────────────────── */

export default function BiometricDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [employees, setEmployees] = useState<MappingEmployee[]>([]);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [punchTotal, setPunchTotal] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Shown once, right after the key is minted — it is never retrievable again.
  const [freshKey, setFreshKey] = useState<{ name: string; key: string } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    serialNumber: "",
    brand: "ZKTECO",
    mode: "BRIDGE",
    location: "",
    ipAddress: "",
    tzOffsetMin: 300,
  });

  const [mapEdits, setMapEdits] = useState<Record<string, string>>({});
  const [mapSearch, setMapSearch] = useState("");

  const [logFilters, setLogFilters] = useState({
    deviceId: "",
    from: todayIso(),
    to: todayIso(),
    unmappedOnly: false,
  });

  const [importDeviceId, setImportDeviceId] = useState("");
  const [importText, setImportText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useState({ from: todayIso(), to: todayIso() });

  /* ── loading ─────────────────────────────────────────────────────────── */

  const loadDevices = useCallback(async () => {
    const res = await fetch("/api/attendance/devices", { headers: authH() });
    if (res.ok) setDevices(await res.json());
  }, []);

  const loadMapping = useCallback(async () => {
    const res = await fetch("/api/attendance/mapping", { headers: authH() });
    if (!res.ok) return;
    const data = await res.json();
    setEmployees(data.employees || []);
    setOrphans(data.unmapped || []);
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/attendance/settings", { headers: authH() });
    if (res.ok) setSettings(await res.json());
  }, []);

  const loadPunches = useCallback(async () => {
    const q = new URLSearchParams();
    if (logFilters.deviceId) q.set("deviceId", logFilters.deviceId);
    if (logFilters.from) q.set("from", logFilters.from);
    if (logFilters.to) q.set("to", logFilters.to);
    if (logFilters.unmappedOnly) q.set("unmappedOnly", "1");
    const res = await fetch(`/api/attendance/punches?${q}`, { headers: authH() });
    if (!res.ok) return;
    const data = await res.json();
    setPunches(data.rows || []);
    setPunchTotal(data.total || 0);
  }, [logFilters]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadDevices(), loadMapping(), loadSettings()]);
      setLoading(false);
    })();
  }, [loadDevices, loadMapping, loadSettings]);

  useEffect(() => {
    loadPunches();
  }, [loadPunches]);

  /* ── actions ─────────────────────────────────────────────────────────── */

  async function addDevice() {
    if (!draft.name.trim() || !draft.serialNumber.trim()) {
      toast.error("Name aur serial number zaroori hain");
      return;
    }
    setBusy("add");
    try {
      const res = await fetch("/api/attendance/devices", {
        method: "POST",
        headers: authH(),
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setFreshKey({ name: data.name, key: data.apiKey });
      setShowAdd(false);
      setDraft({ name: "", serialNumber: "", brand: "ZKTECO", mode: "BRIDGE", location: "", ipAddress: "", tzOffsetMin: 300 });
      await loadDevices();
      toast.success("Device registered");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleDevice(d: Device) {
    setBusy(d.id);
    try {
      const res = await fetch(`/api/attendance/devices?id=${d.id}`, {
        method: "PUT",
        headers: authH(),
        body: JSON.stringify({ isActive: !d.isActive }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Failed");
      await loadDevices();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function rotateKey(d: Device) {
    const ok = await confirmToast(
      `"${d.name}" ki purani key foran band ho jayegi. Bridge agent me nayi key daalni paray gi — jari rakhein?`
    );
    if (!ok) return;
    setBusy(d.id);
    try {
      const res = await fetch(`/api/attendance/devices/${d.id}/rotate-key`, {
        method: "POST",
        headers: authH(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setFreshKey({ name: d.name, key: data.apiKey });
      await loadDevices();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function removeDevice(d: Device) {
    const ok = await confirmToast(
      `"${d.name}" aur us ki ${d._count?.punches ?? 0} raw punches delete ho jayengi. Pehle se bani attendance rows rahengi. Delete karein?`
    );
    if (!ok) return;
    setBusy(d.id);
    try {
      const res = await fetch(`/api/attendance/devices?id=${d.id}`, { method: "DELETE", headers: authH() });
      if (!res.ok) throw new Error((await res.json())?.error || "Failed");
      await Promise.all([loadDevices(), loadPunches()]);
      toast.success("Device removed");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function saveMapping() {
    const mappings = Object.entries(mapEdits).map(([employeeId, biometricId]) => ({ employeeId, biometricId }));
    if (mappings.length === 0) {
      toast("Koi tabdeeli nahi");
      return;
    }
    setBusy("map");
    try {
      const res = await fetch("/api/attendance/mapping", {
        method: "PUT",
        headers: authH(),
        body: JSON.stringify({ mappings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMapEdits({});
      await Promise.all([loadMapping(), loadPunches()]);
      toast.success(
        data.historyLinked > 0
          ? `${data.saved} mapped — ${data.historyLinked} purani punches bhi attach ho gayin`
          : `${data.saved} mapped`
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setBusy("settings");
    try {
      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        headers: authH(),
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Failed");
      toast.success("Rules saved — agle reprocess par lagu hongi");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function runJob(body: Record<string, unknown>, describe: (r: any) => string) {
    setBusy("job");
    try {
      const res = await fetch("/api/attendance/punches", {
        method: "POST",
        headers: authH(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      toast.success(describe(data));
      await Promise.all([loadPunches(), loadMapping()]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function runImport() {
    if (!importDeviceId) {
      toast.error("Pehle device chunein");
      return;
    }
    if (!importText.trim()) {
      toast.error("File ya text khali hai");
      return;
    }
    setBusy("import");
    try {
      const res = await fetch("/api/attendance/import", {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({ deviceId: importDeviceId, content: importText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      toast.success(
        `${data.parsed} rows parhi — ${data.inserted} stored, ${data.duplicates} duplicate` +
          (data.unmapped ? `, ${data.unmapped} unmapped` : "")
      );
      setImportText("");
      if (fileRef.current) fileRef.current.value = "";
      await Promise.all([loadPunches(), loadMapping(), loadDevices()]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  const mappedCount = useMemo(() => employees.filter((e) => e.biometricId).length, [employees]);
  const visibleEmployees = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.firstName} ${e.lastName} ${e.employeeId} ${e.department}`.toLowerCase().includes(q)
    );
  }, [employees, mapSearch]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.finovaos.app";

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: ff, color: "var(--text-muted)", fontSize: 13 }}>
        Loading attendance devices…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: ff, padding: "20px 22px 60px", maxWidth: 1180, margin: "0 auto" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "var(--text-primary)" }}>
          Attendance Devices
        </h1>
        <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--text-muted)", maxWidth: 720 }}>
          Fingerprint / face machine ko FinovaOS se jorne ke liye. Neeche ke steps tarteeb se
          poore karein — machine register, employees map, rules set, phir punch log check.
        </p>
      </div>

      {/* One-time key banner */}
      {freshKey && (
        <div
          className="no-print"
          style={{
            ...card,
            border: `1px solid ${ACCENT}66`,
            background: `${ACCENT}10`,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
            Ingest key for “{freshKey.name}” — ye sirf ab dikh rahi hai
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>
            Copy karke bridge agent ki <code>config.json</code> me <code>deviceKey</code> ke against
            paste karein. Page band hone ke baad ye dobara nahi milegi — us surat me “Rotate key”
            se nayi banani paray gi.
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code
              style={{
                flex: 1,
                minWidth: 260,
                padding: "9px 11px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--app-bg)",
                fontSize: 12.5,
                color: "var(--text-primary)",
                wordBreak: "break-all",
              }}
            >
              {freshKey.key}
            </code>
            <button
              style={btn}
              onClick={() => {
                navigator.clipboard?.writeText(freshKey.key);
                toast.success("Key copied");
              }}
            >
              Copy
            </button>
            <button style={btnGhost} onClick={() => setFreshKey(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── 1. Machines ─────────────────────────────────────────────────── */}
      <Section
        step={1}
        title="Machines"
        subtitle="Har fingerprint machine yahan register hoti hai aur apni alag ingest key leti hai"
        action={
          <button className="no-print" style={btn} onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "+ Add device"}
          </button>
        }
      >
        {showAdd && (
          <div
            className="no-print"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              background: "var(--app-bg)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
              <div>
                <span style={label}>Device name</span>
                <input
                  style={inp}
                  placeholder="Main Gate"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <span style={label}>Serial number</span>
                <input
                  style={inp}
                  placeholder="Machine ke peeche likha SN"
                  value={draft.serialNumber}
                  onChange={(e) => setDraft({ ...draft, serialNumber: e.target.value })}
                />
              </div>
              <div>
                <span style={label}>Brand</span>
                <select style={inp} value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })}>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span style={label}>Connection mode</span>
                <select style={inp} value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value })}>
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span style={label}>Location (optional)</span>
                <input
                  style={inp}
                  placeholder="Head office"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                />
              </div>
              <div>
                <span style={label}>LAN IP (optional)</span>
                <input
                  style={inp}
                  placeholder="192.168.1.201"
                  value={draft.ipAddress}
                  onChange={(e) => setDraft({ ...draft, ipAddress: e.target.value })}
                />
              </div>
              <div>
                <span style={label}>Device clock offset (min from UTC)</span>
                <input
                  style={inp}
                  type="number"
                  value={draft.tzOffsetMin}
                  onChange={(e) => setDraft({ ...draft, tzOffsetMin: Number(e.target.value) })}
                />
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "10px 0 12px" }}>
              {MODES.find((m) => m.value === draft.mode)?.hint} · Pakistan ka offset 300 hai.
            </p>
            <button style={btn} disabled={busy === "add"} onClick={addDevice}>
              {busy === "add" ? "Saving…" : "Register device"}
            </button>
          </div>
        )}

        {devices.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
            Abhi koi machine register nahi. “Add device” se shuru karein.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
              <thead>
                <tr>
                  <th style={th}>Device</th>
                  <th style={th}>Mode</th>
                  <th style={th}>Key</th>
                  <th style={th}>Last seen</th>
                  <th style={th}>Last punch</th>
                  <th style={th}>Punches</th>
                  <th style={{ ...th, textAlign: "right" }} className="no-print">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} style={{ opacity: d.isActive ? 1 : 0.5 }}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {d.brand} · SN {d.serialNumber}
                        {d.location ? ` · ${d.location}` : ""}
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 11.5 }}>
                        {MODES.find((m) => m.value === d.mode)?.label || d.mode}
                      </span>
                    </td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 11.5 }}>{d.apiKeyPrefix}…</td>
                    <td style={td}>
                      <span
                        style={{
                          color:
                            d.lastSeenAt && Date.now() - new Date(d.lastSeenAt).getTime() < 30 * 60_000
                              ? "#34d399"
                              : "var(--text-muted)",
                        }}
                      >
                        {relative(d.lastSeenAt)}
                      </span>
                    </td>
                    <td style={td}>{relative(d.lastPunchAt)}</td>
                    <td style={td}>{d._count?.punches ?? 0}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }} className="no-print">
                      <button
                        style={{ ...btnGhost, padding: "5px 9px", fontSize: 11.5, marginRight: 6 }}
                        disabled={busy === d.id}
                        onClick={() => toggleDevice(d)}
                      >
                        {d.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        style={{ ...btnGhost, padding: "5px 9px", fontSize: 11.5, marginRight: 6 }}
                        disabled={busy === d.id}
                        onClick={() => rotateKey(d)}
                      >
                        Rotate key
                      </button>
                      <button
                        style={{
                          ...btnGhost,
                          padding: "5px 9px",
                          fontSize: 11.5,
                          color: "#f87171",
                          borderColor: "rgba(248,113,113,.35)",
                        }}
                        disabled={busy === d.id}
                        onClick={() => removeDevice(d)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {devices.some((d) => d.mode === "PUSH") && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--app-bg)",
              fontSize: 11.5,
              color: "var(--text-muted)",
              lineHeight: 1.65,
            }}
          >
            <strong style={{ color: "var(--text-primary)" }}>Push mode setup:</strong> machine ke menu me
            jayen → <em>Comm → Cloud Server / ADMS</em> → server address <code>{origin.replace(/^https?:\/\//, "")}</code>{" "}
            aur port <code>443</code> (HTTPS) daalein. Machine khud <code>/iclock/cdata</code> par
            punches bhejna shuru kar degi. Device wahan sirf apna serial number bhejti hai, is liye
            SN bilkul theek register hona chahiye.
          </div>
        )}
      </Section>

      {/* ── 2. Employee mapping ─────────────────────────────────────────── */}
      <Section
        step={2}
        title="Employee mapping"
        subtitle={`Machine ka enrollment number kis employee ka hai — ${mappedCount} of ${employees.length} mapped`}
        action={
          <button className="no-print" style={btn} disabled={busy === "map"} onClick={saveMapping}>
            {busy === "map" ? "Saving…" : "Save mapping"}
          </button>
        }
      >
        {orphans.length > 0 && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 8,
              border: "1px solid rgba(251,191,36,.35)",
              background: "rgba(251,191,36,.08)",
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fbbf24", marginBottom: 6 }}>
              Ye enrollment numbers punch kar rahe hain lekin kisi employee se jure nahi
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {orphans.map((o) => (
                <span
                  key={o.biometricId}
                  style={{
                    fontSize: 11.5,
                    padding: "4px 9px",
                    borderRadius: 20,
                    border: "1px solid var(--border)",
                    background: "var(--app-bg)",
                    color: "var(--text-primary)",
                  }}
                >
                  <strong>#{o.biometricId}</strong> · {o.punches} punches · last {relative(o.lastSeen)}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              Map karte hi in ki purani punches bhi khud attendance me shamil ho jayengi — machine se
              dobara kuch bhejne ki zarurat nahi.
            </div>
          </div>
        )}

        <input
          className="no-print"
          style={{ ...inp, maxWidth: 300, marginBottom: 12 }}
          placeholder="Search employee…"
          value={mapSearch}
          onChange={(e) => setMapSearch(e.target.value)}
        />

        <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
            <thead>
              <tr>
                <th style={{ ...th, position: "sticky", top: 0, background: "var(--panel-bg)" }}>Employee</th>
                <th style={{ ...th, position: "sticky", top: 0, background: "var(--panel-bg)" }}>Department</th>
                <th style={{ ...th, position: "sticky", top: 0, background: "var(--panel-bg)" }}>Shift</th>
                <th style={{ ...th, position: "sticky", top: 0, background: "var(--panel-bg)" }}>
                  Enrollment no. on machine
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.map((e) => {
                const current = mapEdits[e.id] ?? e.biometricId ?? "";
                const dirty = mapEdits[e.id] !== undefined && mapEdits[e.id] !== (e.biometricId ?? "");
                return (
                  <tr key={e.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>
                        {e.firstName} {e.lastName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.employeeId}</div>
                    </td>
                    <td style={{ ...td, fontSize: 11.5, color: "var(--text-muted)" }}>{e.department}</td>
                    <td style={{ ...td, fontSize: 11.5, color: "var(--text-muted)" }}>
                      {e.shiftStart || "09:00"} – {e.shiftEnd || "18:00"}
                    </td>
                    <td style={td}>
                      <input
                        style={{
                          ...inp,
                          maxWidth: 160,
                          borderColor: dirty ? ACCENT : "var(--border)",
                        }}
                        placeholder="e.g. 7"
                        value={current}
                        onChange={(ev) => setMapEdits({ ...mapEdits, [e.id]: ev.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 3. Rules ────────────────────────────────────────────────────── */}
      <Section
        step={3}
        title="Rules"
        subtitle="Machine sirf waqt bhejti hai — status inhi rules se banta hai"
        action={
          <button className="no-print" style={btn} disabled={busy === "settings"} onClick={saveSettings}>
            {busy === "settings" ? "Saving…" : "Save rules"}
          </button>
        }
      >
        {settings && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
              <div>
                <span style={label}>Grace period (minutes)</span>
                <input
                  style={inp}
                  type="number"
                  min={0}
                  max={240}
                  value={settings.graceMinutes}
                  onChange={(e) => setSettings({ ...settings, graceMinutes: Number(e.target.value) })}
                />
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "5px 0 0" }}>
                  Shift start ke baad itni der tak LATE nahi ginte.
                </p>
              </div>
              <div>
                <span style={label}>Half day below (hours)</span>
                <input
                  style={inp}
                  type="number"
                  min={0}
                  max={24}
                  value={settings.halfDayHours}
                  onChange={(e) => setSettings({ ...settings, halfDayHours: Number(e.target.value) })}
                />
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "5px 0 0" }}>
                  Is se kam kaam ka waqt HALF_DAY ban jata hai.
                </p>
              </div>
              <div>
                <span style={label}>Double-tap window (minutes)</span>
                <input
                  style={inp}
                  type="number"
                  min={0}
                  max={120}
                  value={settings.dedupeMinutes}
                  onChange={(e) => setSettings({ ...settings, dedupeMinutes: Number(e.target.value) })}
                />
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "5px 0 0" }}>
                  Itni der ke andar do scans ek hi punch gine jate hain.
                </p>
              </div>
              <div>
                <span style={label}>Night shift cutoff (hour)</span>
                <input
                  style={inp}
                  type="number"
                  min={0}
                  max={12}
                  value={settings.nightShiftCutoffHour}
                  onChange={(e) => setSettings({ ...settings, nightShiftCutoffHour: Number(e.target.value) })}
                />
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "5px 0 0" }}>
                  Raat wali shift ka is waqt se pehle ka scan pichle din ka check-out ginte hain.
                </p>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                marginTop: 16,
                cursor: "pointer",
                fontSize: 12.5,
                color: "var(--text-primary)",
              }}
            >
              <input
                type="checkbox"
                checked={settings.autoAbsent}
                onChange={(e) => setSettings({ ...settings, autoAbsent: e.target.checked })}
                style={{ marginTop: 2 }}
              />
              <span>
                Jis employee ka din bhar koi punch na ho use ABSENT mark karein
                <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  Sirf tab on karein jab machine par saare employees enroll ho chuke hon — warna maujood
                  logon ko bhi absent laga dega. Yeh step 5 ke “Finalize day” button se chalta hai.
                </span>
              </span>
            </label>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--app-bg)",
                fontSize: 11.5,
                color: "var(--text-muted)",
                lineHeight: 1.65,
              }}
            >
              LEAVE aur HOLIDAY wali attendance kabhi overwrite nahi hoti — jo chhutti approve ho chuki
              hai wo machine ke data se nahi badalti. Shift timings har employee ke apne record se aati
              hain (Employees page).
            </div>
          </>
        )}
      </Section>

      {/* ── 4. Import ───────────────────────────────────────────────────── */}
      <Section
        step={4}
        title="Import a log file"
        subtitle="Machine tak network na ho to vendor software (ZKTime, eTimeTrack) se export karke yahan upload karein"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <div>
            <span style={label}>Import against device</span>
            <select style={inp} value={importDeviceId} onChange={(e) => setImportDeviceId(e.target.value)}>
              <option value="">Select…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (SN {d.serialNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <span style={label}>CSV / TXT file</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.dat,.tsv"
              style={{ ...inp, padding: "6px 8px" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportText(await file.text());
                toast.success(`${file.name} parh li — ab Import dabayen`);
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <span style={label}>Ya seedha paste karein</span>
          <textarea
            style={{ ...inp, minHeight: 90, fontFamily: "monospace", fontSize: 11.5 }}
            placeholder={"User ID,Date/Time,State\n7,28-08-2026 09:03:11,0\n7,28-08-2026 18:11:40,1"}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>
            Comma, tab ya semicolon — teeno chalte hain. Header ho to columns naam se pehchane jate
            hain, warna pehla column enrollment number aur doosra date/time mana jata hai.
            DD-MM-YYYY aur YYYY-MM-DD dono qabool hain.
          </p>
        </div>

        <button style={{ ...btn, marginTop: 12 }} disabled={busy === "import"} onClick={runImport}>
          {busy === "import" ? "Importing…" : "Import log"}
        </button>
      </Section>

      {/* ── 5. Punch log ────────────────────────────────────────────────── */}
      <Section
        step={5}
        title="Punch log"
        subtitle={`Machine se aaye raw scans — ${punchTotal} in this range`}
        action={
          <button className="no-print" style={btnGhost} onClick={() => window.print()}>
            Print
          </button>
        }
      >
        <div
          className="no-print"
          style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 14 }}
        >
          <div>
            <span style={label}>Device</span>
            <select
              style={{ ...inp, minWidth: 170 }}
              value={logFilters.deviceId}
              onChange={(e) => setLogFilters({ ...logFilters, deviceId: e.target.value })}
            >
              <option value="">All devices</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span style={label}>From</span>
            <DateInput
              value={logFilters.from}
              onChange={(iso) => setLogFilters({ ...logFilters, from: iso })}
              style={{ ...inp, width: 140 }}
            />
          </div>
          <div>
            <span style={label}>To</span>
            <DateInput
              value={logFilters.to}
              onChange={(iso) => setLogFilters({ ...logFilters, to: iso })}
              style={{ ...inp, width: 140 }}
            />
          </div>
          <label
            style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-primary)", paddingBottom: 8 }}
          >
            <input
              type="checkbox"
              checked={logFilters.unmappedOnly}
              onChange={(e) => setLogFilters({ ...logFilters, unmappedOnly: e.target.checked })}
            />
            Unmapped only
          </label>
        </div>

        {/* Jobs */}
        <div
          className="no-print"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "flex-end",
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--app-bg)",
            marginBottom: 14,
          }}
        >
          <div>
            <span style={label}>Rebuild attendance from</span>
            <DateInput value={range.from} onChange={(iso) => setRange({ ...range, from: iso })} style={{ ...inp, width: 140 }} />
          </div>
          <div>
            <span style={label}>To</span>
            <DateInput value={range.to} onChange={(iso) => setRange({ ...range, to: iso })} style={{ ...inp, width: 140 }} />
          </div>
          <button
            style={btn}
            disabled={busy === "job"}
            onClick={() =>
              runJob({ action: "reprocess", from: range.from, to: range.to }, (r) =>
                `${r.daysBuilt} din bane — ${r.created} nayi, ${r.updated} update, ${r.skippedProtected} leave/holiday chhori`
              )
            }
          >
            {busy === "job" ? "Working…" : "Reprocess"}
          </button>
          <button
            style={btnGhost}
            disabled={busy === "job"}
            onClick={() => runJob({ action: "relink" }, (r) => `${r.historyLinked} punches employees se juri`)}
          >
            Re-link unmapped
          </button>
          <button
            style={btnGhost}
            disabled={busy === "job"}
            onClick={() =>
              runJob({ action: "finalize", date: range.from }, (r) =>
                r.skipped ? `Skipped — ${r.skipped}` : `${r.marked} employees ABSENT mark hue`
              )
            }
          >
            Finalize {fmtDate(range.from)}
          </button>
        </div>

        {punches.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
            Is range me koi punch nahi.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Time</th>
                  <th style={th}>Employee</th>
                  <th style={th}>Enrollment</th>
                  <th style={th}>Device</th>
                  <th style={th}>Dir</th>
                  <th style={th}>Source</th>
                  <th style={th}>Built</th>
                </tr>
              </thead>
              <tbody>
                {punches.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>{fmtDate(p.punchTime)}</td>
                    <td style={{ ...td, fontFamily: "monospace" }}>{fmtTime(p.punchTime)}</td>
                    <td style={td}>
                      {p.employee ? (
                        `${p.employee.firstName} ${p.employee.lastName}`
                      ) : (
                        <span style={{ color: "#fbbf24" }}>unmapped</span>
                      )}
                    </td>
                    <td style={td}>#{p.biometricId}</td>
                    <td style={{ ...td, fontSize: 11.5, color: "var(--text-muted)" }}>{p.device?.name || "—"}</td>
                    <td style={{ ...td, fontSize: 11.5 }}>{p.direction}</td>
                    <td style={{ ...td, fontSize: 11.5, color: "var(--text-muted)" }}>{p.source}</td>
                    <td style={td}>
                      <span style={{ color: p.processed ? "#34d399" : "var(--text-muted)", fontSize: 11.5 }}>
                        {p.processed ? "yes" : "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {punchTotal > punches.length && (
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "10px 0 0" }}>
                Sirf pehle {punches.length} dikhaye ja rahe hain ({punchTotal} total) — range chhoti karein.
              </p>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
