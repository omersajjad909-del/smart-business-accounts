"use client";
import Link from "next/link";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { api, ClassRow, ClassSelect, className, ErrorLine, Field, Guide, Modal, ui, useApi } from "../_ui";
import { DEFAULT_DESIGN, FIELD_LABELS, FIELD_ORDER, SAMPLE_STUDENT, sanitizeDesign, sheetSpec, THEMES, type CardSchool, type CardStudent, type Design, type FieldKey } from "@/lib/idCardDesign";
import { buildIdCardPdf, pdfFileName } from "@/lib/idCardPdf";
import { FacePreview, Sheets } from "./_card";

type Settings = { name: string; logoUrl: string | null; address: string; city: string; phone: string; idCardDesign: unknown };
type CardData = { school: { name: string; logoUrl: string | null }; students: CardStudent[] };
type Tab = "style" | "front" | "back";

export default function IdCardsPage() {
  return <Suspense fallback={<div style={ui.page}>Loading…</div>}><Designer /></Suspense>;
}

/* ── small controls ───────────────────────────────────────────────────────── */
function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(([v, label]) => <button key={v} type="button" onClick={() => onChange(v)} style={{ ...ui.ghost, padding: "7px 12px", fontSize: 12.5, background: value === v ? "#6366f1" : undefined, color: value === v ? "#fff" : undefined, fontWeight: value === v ? 700 : 500 }}>{label}</button>)}
    </div>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, padding: "3px 0", cursor: "pointer" }}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1, minWidth: 120 }}>
      <span style={ui.label}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 40, height: 36, padding: 0, border: "1px solid rgba(var(--ink),.2)", borderRadius: 8, background: "none", cursor: "pointer" }} />
        <code style={{ fontSize: 12 }}>{value.toUpperCase()}</code>
      </div>
    </div>
  );
}
const Group = ({ title, children }: { title: string; children: ReactNode }) => <div style={{ marginBottom: 18 }}><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{title}</div>{children}</div>;

/* ── the designer ─────────────────────────────────────────────────────────── */
function Designer() {
  const sp = useSearchParams();
  const studentId = sp.get("studentId") ?? "";
  const [classId, setClassId] = useState(sp.get("classId") ?? "");
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const { data: settings, reload: reloadSettings } = useApi<Settings | null>("/api/school/settings", null);
  const url = studentId ? `/api/school/print?kind=idcards&studentId=${studentId}` : classId ? `/api/school/print?kind=idcards&classId=${classId}` : null;
  const { data: cards, loading: loadingCards } = useApi<CardData | null>(url, null);

  const [design, setDesign] = useState<Design | null>(null);
  const [saved, setSaved] = useState<string>("");              // JSON of what is stored, to know when there is something to save
  const [tab, setTab] = useState<Tab>("style");
  const [idx, setIdx] = useState(0);
  const [includeBack, setIncludeBack] = useState(true);
  const [mirrorBack, setMirrorBack] = useState(true);
  const [cutGuides, setCutGuides] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  const [mail, setMail] = useState<{ to: string; message: string } | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (settings && design === null) { const d = sanitizeDesign(settings.idCardDesign); setDesign(d); setSaved(JSON.stringify(d)); } }, [settings, design]);

  const students = cards?.students ?? [];
  const school: CardSchool = { name: cards?.school.name ?? settings?.name ?? "School", logoUrl: cards?.school.logoUrl ?? settings?.logoUrl ?? null, address: [settings?.address, settings?.city].filter(Boolean).join(", "), phone: settings?.phone ?? "" };
  const previewStudent = students[Math.min(idx, Math.max(0, students.length - 1))] ?? SAMPLE_STUDENT;
  const usingSample = students.length === 0;

  if (!design) return <div style={ui.page}>Loading your design…</div>;
  const d = design;
  const dirty = JSON.stringify(d) !== saved;
  const spec = sheetSpec(d);
  const sheets = Math.ceil(Math.max(1, students.length) / spec.perPage) * (includeBack && d.back.show ? 2 : 1);

  const set = (patch: Partial<Design>) => setDesign(sanitizeDesign({ ...d, ...patch }));
  const setField = (k: FieldKey, v: boolean) => set({ fields: { ...d.fields, [k]: v } });
  const setBack = (patch: Partial<Design["back"]>) => set({ back: { ...d.back, ...patch } });
  const label = studentId ? (students[0]?.name ?? "student") : (classes.find((c) => c.id === classId) ? className(classes.find((c) => c.id === classId)) : "school");

  const makePdf = () => buildIdCardPdf(d, usingSample ? [SAMPLE_STUDENT] : students, school, { includeBack, mirrorBack, cutGuides });
  async function run(what: string, fn: () => Promise<void>) {
    setBusy(what); setError(""); setMsg("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy("");
  }

  const save = () => run("save", async () => {
    const r = await api("/api/school/settings", { method: "PUT", body: { idCardDesign: d } });
    if (!r.ok) throw new Error(r.error);
    setSaved(JSON.stringify(d)); setMsg("Design saved — it will be used for every card from now on."); void reloadSettings();
  });
  const download = () => run("pdf", async () => { const doc = await makePdf(); doc.save(pdfFileName(label)); setMsg(`PDF downloaded (${students.length || 1} card${students.length === 1 ? "" : "s"}, ${sheets} sheet${sheets === 1 ? "" : "s"}).`); });
  const share = () => run("share", async () => {
    const doc = await makePdf();
    const file = new File([doc.output("blob")], pdfFileName(label), { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "ID cards", text: `ID cards — ${school.name}` }).catch((e) => { if (e?.name !== "AbortError") throw e; }); return; }
    doc.save(pdfFileName(label));
    setMsg("This browser can't share files directly, so the PDF was downloaded. Attach it in WhatsApp or email to send it.");
  });
  const sendMail = () => run("mail", async () => {
    if (!mail) return;
    const doc = await makePdf();
    const r = await api("/api/school/id-cards/email", { method: "POST", body: { to: mail.to, message: mail.message, filename: pdfFileName(label), pdfBase64: doc.output("datauristring").split(",")[1] } });
    if (!r.ok) throw new Error(r.error);
    setMsg(`PDF emailed to ${mail.to}.`); setMail(null);
  });

  return (
    <div style={ui.page}>
      <style>{`@media screen { .idc-print { display: none !important; } } @media print { @page { size: A4 portrait; margin: 0; } .idc-print { display: block !important; } }`}</style>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>ID Card Designer</h1><p style={ui.sub}>Design the front and back once, then print, download a PDF, or send it to the printer</p></div>
        <Link href="/dashboard/school/students" style={{ ...ui.ghost, textDecoration: "none" }}>← Students</Link>
      </div>
      <Guide title="How this works" steps={["Choose a class (or open this from a student's profile for a single card).", "Change the design on the left — the front and back update as you go. Save it and every card uses it.", "Print on A4 (back sheets are mirrored for double-sided printing), download the PDF, or share/email it to the press."]} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {studentId ? <span style={{ fontWeight: 600 }}>Single card: {students[0]?.name ?? "…"} <Link href="/dashboard/school/id-cards" style={{ color: "#818cf8", fontWeight: 500, fontSize: 13 }}>· choose a class instead</Link></span> : <ClassSelect classes={classes} value={classId} onChange={(v) => { setClassId(v); setIdx(0); }} allLabel="Choose a class" />}
        {students.length > 0 && !studentId && <><span style={ui.sub}>{students.length} student{students.length === 1 ? "" : "s"}</span><select style={{ ...ui.input, width: "auto", minWidth: 220 }} value={idx} onChange={(e) => setIdx(Number(e.target.value))}>{students.map((s, i) => <option key={i} value={i}>Preview: {s.admissionNo} · {s.name}</option>)}</select></>}
        {!studentId && classId && !loadingCards && students.length === 0 && <span style={{ color: "#fbbf24", fontSize: 13 }}>No active students in this class — showing a sample card.</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px,380px) 1fr", gap: 20, alignItems: "start" }}>
        {/* ── controls ── */}
        <div style={ui.card}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {([["style", "Style"], ["front", "Front"], ["back", "Back"]] as [Tab, string][]).map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ ...ui.ghost, flex: 1, background: tab === k ? "#6366f1" : undefined, color: tab === k ? "#fff" : undefined, fontWeight: 600 }}>{l}</button>)}
          </div>

          {tab === "style" && (
            <>
              <Group title="Template"><Seg value={d.template} onChange={(v) => set({ template: v })} options={[["classic", "Classic"], ["modern", "Modern"], ["minimal", "Minimal"]]} /></Group>
              <Group title="Card shape"><Seg value={d.orientation} onChange={(v) => set({ orientation: v })} options={[["landscape", "Landscape"], ["portrait", "Portrait"]]} /></Group>
              <Group title="Colour theme">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {THEMES.map((t) => <button key={t.name} title={t.name} onClick={() => set({ primary: t.primary, accent: t.accent })} style={{ width: 38, height: 38, borderRadius: 10, cursor: "pointer", border: d.primary === t.primary ? "3px solid #6366f1" : "1px solid rgba(var(--ink),.2)", background: `linear-gradient(135deg, ${t.primary} 62%, ${t.accent} 62%)` }} />)}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <ColorField label="Main" value={d.primary} onChange={(v) => set({ primary: v })} /><ColorField label="Accent" value={d.accent} onChange={(v) => set({ accent: v })} />
                  <ColorField label="Text" value={d.text} onChange={(v) => set({ text: v })} /><ColorField label="Background" value={d.background} onChange={(v) => set({ background: v })} />
                </div>
              </Group>
              <Group title="Photo"><Seg value={d.photoShape} onChange={(v) => set({ photoShape: v })} options={[["square", "Square"], ["rounded", "Rounded"], ["round", "Round"]]} /></Group>
              <Group title="Text size"><Seg value={String(d.fontScale)} onChange={(v) => set({ fontScale: Number(v) })} options={[["0.9", "Small"], ["1", "Normal"], ["1.1", "Large"]]} /></Group>
            </>
          )}

          {tab === "front" && (
            <>
              <Group title="School name & logo">
                <Check label="Show the school logo" checked={d.showLogo} onChange={(v) => set({ showLogo: v })} />
                <Field label="Name on the card (empty = school name)"><input style={ui.input} value={d.schoolName} placeholder={school.name} maxLength={60} onChange={(e) => set({ schoolName: e.target.value })} /></Field>
                <Field label="Tagline (optional)"><input style={ui.input} value={d.tagline} maxLength={60} onChange={(e) => set({ tagline: e.target.value })} placeholder="e.g. Excellence in education" /></Field>
              </Group>
              <Group title="What to show about the student">
                {FIELD_ORDER.map((k) => <Check key={k} label={FIELD_LABELS[k]} checked={d.fields[k]} onChange={(v) => setField(k, v)} />)}
                <p style={{ ...ui.sub, marginBottom: 0 }}>Name and photo are always shown. Empty values are skipped.</p>
              </Group>
              <Group title="Footer">
                <Field label="Validity text (empty = automatic)"><input style={ui.input} value={d.validityText} maxLength={40} onChange={(e) => set({ validityText: e.target.value })} placeholder="Valid till 31 Mar 2027" /></Field>
                <Check label="Show a signature label" checked={d.showSignature} onChange={(v) => set({ showSignature: v })} />
                {d.showSignature && <Field label="Signature label"><input style={ui.input} value={d.signatureLabel} maxLength={30} onChange={(e) => set({ signatureLabel: e.target.value })} /></Field>}
              </Group>
            </>
          )}

          {tab === "back" && (
            <>
              <Check label="Print a back side" checked={d.back.show} onChange={(v) => setBack({ show: v })} />
              {d.back.show && (
                <div style={{ marginTop: 10 }}>
                  <Field label="Heading"><input style={ui.input} value={d.back.title} maxLength={40} onChange={(e) => setBack({ title: e.target.value })} /></Field>
                  <Field label="Text (rules, instructions)"><textarea style={{ ...ui.input, height: 110, resize: "vertical" }} value={d.back.text} maxLength={400} onChange={(e) => setBack({ text: e.target.value })} /></Field>
                  <Check label="Show the school address & phone" checked={d.back.showAddress} onChange={(v) => setBack({ showAddress: v })} />
                  <Check label="Show an emergency number (guardian's phone)" checked={d.back.showEmergency} onChange={(v) => setBack({ showEmergency: v })} />
                  <Field label="Bottom bar text (optional)"><input style={{ ...ui.input, marginTop: 8 }} value={d.back.footer} maxLength={60} onChange={(e) => setBack({ footer: e.target.value })} /></Field>
                  {d.back.showAddress && !school.address && <p style={{ fontSize: 12.5, color: "#fbbf24" }}>Your school address is empty. Add it in <Link href="/dashboard/school/setup" style={{ color: "#818cf8" }}>School Setup</Link> so it shows here.</p>}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── preview + outputs ── */}
        <div>
          <div style={{ ...ui.card, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center", padding: "10px 0 4px" }}>
              <div><div style={{ ...ui.label, textAlign: "center" }}>Front</div><FacePreview k={d.orientation === "landscape" ? 4.3 : 3.8} design={d} student={previewStudent} school={school} side="front" /></div>
              {d.back.show && <div><div style={{ ...ui.label, textAlign: "center" }}>Back</div><FacePreview k={d.orientation === "landscape" ? 4.3 : 3.8} design={d} student={previewStudent} school={school} side="back" /></div>}
            </div>
            <p style={{ ...ui.sub, textAlign: "center", marginBottom: 0 }}>{usingSample ? "Sample card — pick a class to see real students." : `Previewing ${previewStudent.name}. Photos show once a photo is uploaded on the student.`}</p>
          </div>

          <div style={ui.card}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Print & share</div>
            <div style={{ display: "flex", gap: "4px 22px", flexWrap: "wrap", marginBottom: 12 }}>
              <Check label="Include the back side" checked={includeBack} onChange={setIncludeBack} />
              <Check label="Mirror backs for double-sided printing" checked={mirrorBack} onChange={setMirrorBack} />
              <Check label="Cut guides" checked={cutGuides} onChange={setCutGuides} />
            </div>
            <p style={{ ...ui.sub, marginTop: 0 }}>{spec.perPage} cards per A4 sheet · {Math.max(1, students.length)} card{students.length === 1 ? "" : "s"} → {sheets} sheet{sheets === 1 ? "" : "s"}. For double-sided printing choose &quot;flip on the long edge&quot;.</p>
            <ErrorLine text={error} />
            {msg && <div style={{ color: "#4ade80", fontSize: 13, marginBottom: 10 }}>{msg}</div>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={ui.btn} onClick={() => window.print()}>🖨 Print</button>
              <button style={ui.ghost} disabled={!!busy} onClick={download}>{busy === "pdf" ? "Making PDF…" : "⬇ Download PDF"}</button>
              <button style={ui.ghost} disabled={!!busy} onClick={share}>{busy === "share" ? "Preparing…" : "📤 Share"}</button>
              <button style={ui.ghost} disabled={!!busy} onClick={() => setMail({ to: "", message: "" })}>✉ Email PDF</button>
              <span style={{ flex: 1 }} />
              <button style={ui.ghost} onClick={() => setDesign({ ...DEFAULT_DESIGN })}>↺ Reset</button>
              <button style={{ ...ui.btn, opacity: dirty ? 1 : 0.55 }} disabled={!!busy || !dirty} onClick={save}>{busy === "save" ? "Saving…" : dirty ? "💾 Save design" : "✓ Saved"}</button>
            </div>
            <p style={{ ...ui.sub, marginBottom: 0 }}>The PDF uses standard fonts, so Urdu names appear only when you use the browser&apos;s Print button.</p>
          </div>
        </div>
      </div>

      {/* what actually reaches the printer — hidden on screen */}
      <div className="print-doc-a4 idc-print"><Sheets design={d} students={usingSample ? [SAMPLE_STUDENT] : students} school={school} includeBack={includeBack} mirrorBack={mirrorBack} cutGuides={cutGuides} /></div>

      {mail && (
        <Modal title="Email the PDF" subtitle="Send the print-ready PDF to your printing press or anyone else" onClose={() => setMail(null)}
          footer={<><button style={ui.ghost} onClick={() => setMail(null)}>Cancel</button><button style={ui.btn} disabled={busy === "mail" || !mail.to.trim()} onClick={sendMail}>{busy === "mail" ? "Sending…" : "Send"}</button></>}>
          <ErrorLine text={error} />
          <Field label="Send to (email)"><input style={ui.input} type="email" value={mail.to} onChange={(e) => setMail({ ...mail, to: e.target.value })} placeholder="press@example.com" autoFocus /></Field>
          <Field label="Message (optional)"><textarea style={{ ...ui.input, height: 90 }} value={mail.message} onChange={(e) => setMail({ ...mail, message: e.target.value })} placeholder="e.g. 120 cards, PVC 85.6×54 mm, double-sided" /></Field>
          <p style={ui.sub}>Sent from your school&apos;s email setup. PDFs over 4 MB can&apos;t be emailed — download and share the file instead.</p>
        </Modal>
      )}
    </div>
  );
}
