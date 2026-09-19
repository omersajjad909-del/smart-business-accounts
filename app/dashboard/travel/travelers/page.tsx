"use client";

/**
 * Travellers — the people who fly.
 *
 * Distinct from customers, who pay. A family books under the father's account
 * and four people travel; a company books under its own and two hundred do.
 *
 * Everything else in the travel module will hang off this: a booking names
 * travellers rather than retyping their passports, the six-month rule is
 * checked here instead of at the airline's desk, and somebody who rings up
 * saying "you booked me last year" can be found.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useResponsive } from "@/hooks/useResponsive";
import { confirmToast, alertToast } from "@/lib/toast-feedback";
import { Field, GhostButton, PrimaryButton, T, ff, flightCss, inputStyle } from "../_flight/ui";

type Traveler = {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  cnic: string | null;
  passportNo: string | null;
  passportExpiry: string | null;
  passportIssue: string | null;
  passportCountry: string | null;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  notes: string | null;
};

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Mstr", "Dr"];

const empty = {
  id: "", title: "Mr", firstName: "", lastName: "", dob: "", gender: "",
  nationality: "Pakistan", cnic: "", passportNo: "", passportExpiry: "",
  passportIssue: "", passportCountry: "Pakistan", email: "", phone: "",
  altPhone: "", emergencyName: "", emergencyPhone: "", notes: "",
};

/**
 * How long this passport has left, and whether that is a problem.
 *
 * Most carriers refuse a passport with under six months to run, and the
 * passenger finds out at check-in. Six months is therefore the warning, not
 * the expiry date itself.
 */
function passportState(expiry: string | null) {
  if (!expiry) return { label: "Not recorded", tone: T.muted, urgent: false };
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 864e5);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: "#f87171", urgent: true };
  if (days < 183) return { label: `${days}d left — under 6 months`, tone: "#f4c25b", urgent: true };
  return { label: `${Math.floor(days / 30)} months left`, tone: "#34d399", urgent: false };
}

export default function TravelersPage() {
  const { isMobile, isTablet } = useResponsive();
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [expiring, setExpiring] = useState<Traveler[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const [all, soon] = await Promise.all([
        fetch(`/api/travel/travelers?q=${encodeURIComponent(q)}&limit=100`).then((r) => (r.ok ? r.json() : null)),
        // Six months, which is the rule the airlines actually apply.
        fetch("/api/travel/travelers?expiringWithinDays=183&limit=50").then((r) => (r.ok ? r.json() : null)),
      ]);
      setTravelers(all?.travelers ?? []);
      setExpiring(soon?.travelers ?? []);
    } catch {
      setTravelers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, load]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const editing = Boolean(form.id);
      const response = await fetch("/api/travel/travelers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not save");
      alertToast(
        body.reused
          ? `${body.traveler.fullName} was already on file — the new details were merged in.`
          : `${body.traveler.fullName} saved.`,
        "success",
        editing ? "Traveller Updated" : "Traveller Saved",
      );
      setForm({ ...empty });
      await load(search);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the traveller");
    } finally {
      setSaving(false);
    }
  }

  async function remove(traveler: Traveler) {
    if (!await confirmToast(`Remove ${traveler.fullName}?`)) return;
    try {
      const response = await fetch(`/api/travel/travelers?id=${encodeURIComponent(traveler.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
      await load(search);
    } catch {
      setError("Could not remove the traveller");
    }
  }

  function edit(traveler: Traveler) {
    setForm({
      id: traveler.id,
      title: traveler.title || "Mr",
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      dob: (traveler.dob || "").slice(0, 10),
      gender: traveler.gender || "",
      nationality: traveler.nationality || "",
      cnic: traveler.cnic || "",
      passportNo: traveler.passportNo || "",
      passportExpiry: (traveler.passportExpiry || "").slice(0, 10),
      passportIssue: (traveler.passportIssue || "").slice(0, 10),
      passportCountry: traveler.passportCountry || "",
      email: traveler.email || "",
      phone: traveler.phone || "",
      altPhone: traveler.altPhone || "",
      emergencyName: traveler.emergencyName || "",
      emergencyPhone: traveler.emergencyPhone || "",
      notes: traveler.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cell = { ...inputStyle, padding: "9px 11px", fontSize: 13 };
  const ready = form.firstName.trim() && form.lastName.trim();

  const stats = useMemo(() => {
    const withPassport = travelers.filter((t) => t.passportNo).length;
    return [
      { label: "Travellers", value: travelers.length, color: "#38bdf8" },
      { label: "With Passport", value: withPassport, color: "#34d399" },
      { label: "No Passport Yet", value: travelers.length - withPassport, color: travelers.length - withPassport ? "#f4c25b" : "#34d399" },
      { label: "Expiring in 6 Months", value: expiring.length, color: expiring.length ? "#f87171" : "#34d399" },
    ];
  }, [travelers, expiring]);

  return (
    <div style={{ padding: isMobile ? 16 : "24px 28px", fontFamily: ff, color: T.text, maxWidth: "100%", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <header style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg,var(--accent),var(--accent-strong))", fontSize: 19 }}>👤</span>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: T.text }}>Travellers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>
            The people who fly — kept once and reused, so a passport is typed in from the photocopy only the first time.
          </p>
        </div>
        <input
          className="fl-in"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, passport, phone or CNIC"
          style={{ ...cell, flex: "0 1 300px" }}
        />
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 18 }}>
        {stats.map((card) => (
          <div key={card.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* The six-month rule, before the airline applies it at the desk. */}
      {expiring.length ? (
        <div style={{ border: "1px solid rgba(248,113,113,.4)", background: "rgba(248,113,113,.08)", borderRadius: 14, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#f87171", marginBottom: 4 }}>
            ⚠️ {expiring.length} passport{expiring.length === 1 ? "" : "s"} expiring within six months
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
            Most carriers refuse a passport with under six months to run, and the passenger finds out at check-in.
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {expiring.slice(0, 8).map((traveler) => {
              const state = passportState(traveler.passportExpiry);
              return (
                <div key={traveler.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: T.text }}>
                    {traveler.fullName}{" "}
                    <span style={{ color: T.muted }}>· {traveler.passportNo || "no passport number"}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: state.tone }}>{state.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: isTablet ? "minmax(0,1fr)" : "minmax(300px,380px) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, display: "grid", gap: 14, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
            {form.id ? "Edit traveller" : "Add a traveller"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 130 : 145}px,1fr))`, gap: 12 }}>
            <Field label="Title">
              <select value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={cell}>
                {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="First Name" required>
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Ali" style={cell} className="fl-in" />
            </Field>
            <Field label="Last Name" required>
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Raza" style={cell} className="fl-in" />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} style={cell} className="fl-in" />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={cell}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
            <Field label="CNIC">
              <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="35202-1234567-1" style={cell} className="fl-in" />
            </Field>
            <Field label="Passport Number" hint="Matching this is how a repeat traveller is recognised">
              <input value={form.passportNo} onChange={(e) => setForm({ ...form, passportNo: e.target.value.toUpperCase() })} placeholder="AB1234567" style={cell} className="fl-in" />
            </Field>
            <Field label="Passport Expiry">
              <input type="date" value={form.passportExpiry} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} style={cell} className="fl-in" />
            </Field>
            <Field label="Nationality">
              <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} style={cell} className="fl-in" />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 1234567" style={cell} className="fl-in" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={cell} className="fl-in" />
            </Field>
            <Field label="Emergency Contact" hint="Who to ring if something happens abroad">
              <input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} placeholder="Optional" style={cell} className="fl-in" />
            </Field>
          </div>

          {error ? <div style={{ fontSize: 12.5, color: "#f87171" }}>{error}</div> : null}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {form.id ? <GhostButton onClick={() => setForm({ ...empty })}>Cancel</GhostButton> : null}
            <PrimaryButton onClick={save} disabled={!ready || saving}>
              {saving ? "Saving…" : form.id ? "Save changes" : "Add traveller"}
            </PrimaryButton>
          </div>
        </section>

        <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: isMobile ? 14 : 18, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>On file</div>
            <div style={{ fontSize: 12, color: T.muted }}>{travelers.length} shown</div>
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
          ) : !travelers.length ? (
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              {search
                ? `Nobody matches “${search}”.`
                : "No travellers yet. Add the first one here, or they will be created as you take bookings."}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {travelers.map((traveler) => {
                const state = passportState(traveler.passportExpiry);
                return (
                  <article
                    key={traveler.id}
                    className="fl-card"
                    style={{ border: `1px solid ${T.border}`, borderRadius: 13, background: "var(--panel-bg)", padding: 13, display: "grid", gap: 9 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: T.text }}>
                          {traveler.title ? `${traveler.title} ` : ""}{traveler.fullName}
                        </div>
                        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                          {[traveler.passportNo, traveler.nationality, traveler.phone].filter(Boolean).join(" · ") || "No passport or contact recorded"}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 700, color: state.tone, whiteSpace: "nowrap",
                          border: `1px solid ${state.tone}44`, background: `${state.tone}14`,
                          borderRadius: 999, padding: "4px 10px",
                        }}
                      >
                        {state.label}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: `1px solid ${T.border}`, paddingTop: 9 }}>
                      <button
                        type="button"
                        onClick={() => edit(traveler)}
                        style={{ border: `1px solid ${T.border}`, background: "transparent", color: T.text, borderRadius: 9, padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(traveler)}
                        style={{ border: "none", background: "transparent", color: "#f87171", borderRadius: 9, padding: "6px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
