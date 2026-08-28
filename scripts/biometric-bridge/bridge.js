#!/usr/bin/env node
/**
 * FinovaOS biometric bridge.
 *
 * The attendance machine sits on the office LAN with a private IP; FinovaOS is
 * on the internet. Nothing can reach the machine from outside, so this agent
 * runs on a PC in the same office, pulls the scan log over the LAN, and posts
 * it out to FinovaOS. Outbound HTTPS only — no port forwarding, no static IP,
 * no firewall holes.
 *
 * Runs against any ZKTeco-protocol device (K40, F18, MB360, iClock, and the
 * eSSL/Anviz clones that speak the same thing) on TCP 4370.
 *
 *   npm install
 *   node bridge.js            (add --once to sync a single time and exit)
 *
 * Everything is configured in config.json — see config.example.json.
 */

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "config.json");
const STATE_PATH = path.join(__dirname, ".bridge-state.json");

/* ── config ─────────────────────────────────────────────────────────────── */

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("config.json not found. Copy config.example.json to config.json and fill it in.");
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  for (const field of ["serverUrl", "deviceKey", "deviceIp"]) {
    if (!cfg[field]) {
      console.error(`config.json is missing "${field}".`);
      process.exit(1);
    }
  }
  return {
    serverUrl: String(cfg.serverUrl).replace(/\/+$/, ""),
    deviceKey: cfg.deviceKey,
    deviceIp: cfg.deviceIp,
    devicePort: cfg.devicePort || 4370,
    pollSeconds: Math.max(30, cfg.pollSeconds || 120),
    batchSize: Math.min(2000, cfg.batchSize || 500),
    clearAfterSync: cfg.clearAfterSync === true,
    timeoutMs: cfg.timeoutMs || 15000,
  };
}

/* ── state ──────────────────────────────────────────────────────────────── */
/* The device keeps its whole log, so without a high-water mark every poll
   would re-send months of scans. The server dedupes anyway, but sending 40k
   rows every two minutes is not a plan. */

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { lastPunchIso: null };
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    log("warn", `could not write state file: ${err.message}`);
  }
}

/* ── logging ────────────────────────────────────────────────────────────── */

function log(level, message) {
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const prefix = level === "error" ? "ERROR" : level === "warn" ? "WARN " : "INFO ";
  console.log(`[${stamp}] ${prefix} ${message}`);
}

/* ── device ─────────────────────────────────────────────────────────────── */

/** Device timestamps have no zone; send them as the machine's own wall clock. */
function toWallClock(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`;
}

async function readDeviceLogs(cfg) {
  const ZKLib = require("node-zklib");
  const zk = new ZKLib(cfg.deviceIp, cfg.devicePort, cfg.timeoutMs, 4000);

  await zk.createSocket();
  try {
    const res = await zk.getAttendances();
    const rows = Array.isArray(res) ? res : res && res.data ? res.data : [];
    return rows
      .map((r) => {
        const time = toWallClock(r.recordTime || r.timestamp || r.record_time);
        if (!time) return null;
        return {
          biometricId: String(r.deviceUserId ?? r.userId ?? r.uid ?? "").trim(),
          time,
          // The ZKTeco state byte: 0/4 mean in, 1/5 mean out, others are
          // meaningless on most installs — let the server's rules decide.
          direction:
            r.state === 0 || r.state === 4 ? "IN" : r.state === 1 || r.state === 5 ? "OUT" : "AUTO",
          verifyMode: r.type != null ? String(r.type) : null,
        };
      })
      .filter((r) => r && r.biometricId);
  } finally {
    try {
      await zk.disconnect();
    } catch {}
  }
}

/* ── server ─────────────────────────────────────────────────────────────── */

async function post(cfg, payload) {
  const res = await fetch(`${cfg.serverUrl}/api/attendance/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-key": cfg.deviceKey },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return json || {};
}

async function verifyKey(cfg) {
  const res = await fetch(`${cfg.serverUrl}/api/attendance/ingest`, {
    headers: { "x-device-key": cfg.deviceKey },
  });
  if (!res.ok) {
    throw new Error(`server rejected the device key (HTTP ${res.status})`);
  }
  return res.json();
}

/* ── sync ───────────────────────────────────────────────────────────────── */

async function syncOnce(cfg, state) {
  const all = await readDeviceLogs(cfg);
  log("info", `machine holds ${all.length} scan(s)`);

  const since = state.lastPunchIso;
  const fresh = since ? all.filter((r) => r.time > since) : all;

  if (fresh.length === 0) {
    // Still check in, so the dashboard can show the machine as online rather
    // than "last seen 3 days ago" through a quiet weekend.
    await post(cfg, { punches: [] });
    log("info", "no new scans — heartbeat sent");
    return state;
  }

  fresh.sort((a, b) => (a.time < b.time ? -1 : 1));
  log("info", `${fresh.length} new scan(s) to send`);

  let sent = 0;
  let inserted = 0;
  let unmapped = 0;

  for (let i = 0; i < fresh.length; i += cfg.batchSize) {
    const batch = fresh.slice(i, i + cfg.batchSize);
    const result = await post(cfg, { punches: batch });
    sent += batch.length;
    inserted += result.inserted || 0;
    unmapped += result.unmapped || 0;

    // Advance the mark per batch, not at the end: a crash halfway through a
    // month's backlog should not restart from zero.
    state.lastPunchIso = batch[batch.length - 1].time;
    saveState(state);
  }

  log("info", `sent ${sent}, stored ${inserted}, duplicates ${sent - inserted}`);
  if (unmapped > 0) {
    log(
      "warn",
      `${unmapped} scan(s) belong to enrollment numbers no employee is mapped to — ` +
        "fix that in Attendance → Devices → Employee mapping, the punches are kept meanwhile"
    );
  }

  if (cfg.clearAfterSync) {
    log("warn", "clearAfterSync is on — wiping the machine's log");
    const ZKLib = require("node-zklib");
    const zk = new ZKLib(cfg.deviceIp, cfg.devicePort, cfg.timeoutMs, 4000);
    await zk.createSocket();
    try {
      await zk.clearAttendanceLog();
    } finally {
      try {
        await zk.disconnect();
      } catch {}
    }
  }

  return state;
}

/* ── main ───────────────────────────────────────────────────────────────── */

async function main() {
  const cfg = loadConfig();
  const once = process.argv.includes("--once");
  let state = loadState();

  log("info", `bridge starting — device ${cfg.deviceIp}:${cfg.devicePort} → ${cfg.serverUrl}`);

  try {
    const info = await verifyKey(cfg);
    log("info", `key accepted for "${info.device?.name || "device"}"`);
  } catch (err) {
    log("error", err.message);
    process.exit(1);
  }

  const run = async () => {
    try {
      state = await syncOnce(cfg, state);
    } catch (err) {
      // Never exit on a failed cycle. The machine reboots, the office ADSL
      // drops, the laptop sleeps — the next poll picks up where this left off.
      log("error", `sync failed: ${err.message}`);
    }
  };

  await run();
  if (once) return;

  log("info", `polling every ${cfg.pollSeconds}s — Ctrl+C to stop`);
  setInterval(run, cfg.pollSeconds * 1000);
}

main().catch((err) => {
  log("error", err.stack || err.message);
  process.exit(1);
});
