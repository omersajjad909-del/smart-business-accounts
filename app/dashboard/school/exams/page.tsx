"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const GRADE_COLOR: Record<string, string> = { "A+": "#34d399", A: "#34d399", B: "#818cf8", C: "#fbbf24", D: "#fb923c", F: "#f87171" };

export default function ExamsPage() {
  const { records, loading, create } = useBusinessRecords("exam_result");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ student: "", rollNo: "", class: "", examName: "", totalMarks: 0, obtainedMarks: 0 });

  const results = records.map(r => {
    const total = Number(r.data?.totalMarks) || 100;
    const obtained = Number(r.data?.obtainedMarks) || 0;
    const pct = total > 0 ? Math.round(obtained / total * 100) : 0;
    const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";
    return {
      id: r.id,
      student: r.title,
      rollNo: (r.data?.rollNo as string) || "",
      class: (r.data?.class as string) || "",
      examName: (r.data?.examName as string) || "",
      totalMarks: total,
      obtainedMarks: obtained,
      percentage: pct,
      grade,
      status: pct >= 50 ? "pass" : "fail",
    };
  });

  const passCount = results.filter(r => r.status === "pass").length;
  const avgPct = results.length ? Math.round(results.reduce((a, r) => a + r.percentage, 0) / results.length) : 0;

  async function save() {
    if (!form.student.trim() || !form.rollNo.trim() || !form.class.trim() || !form.examName.trim()) {
      setError("Student, roll number, class, and exam name are required.");
      return;
    }
    if (form.totalMarks <= 0 || form.obtainedMarks < 0 || form.obtainedMarks > form.totalMarks) {
      setError("Marks are invalid.");
      return;
    }
    if (results.some(r => r.rollNo.toLowerCase() === form.rollNo.trim().toLowerCase() && r.examName.toLowerCase() === form.examName.trim().toLowerCase())) {
      setError("This exam result already exists for the selected roll number.");
      return;
    }
    await create({ title: form.student, status: form.obtainedMarks >= form.totalMarks * 0.5 ? "pass" : "fail", data: { rollNo: form.rollNo, class: form.class, examName: form.examName, totalMarks: form.totalMarks, obtainedMarks: form.obtainedMarks } });
    setShowModal(false);
    setError("");
    setForm({ student: "", rollNo: "", class: "", examName: "", totalMarks: 0, obtainedMarks: 0 });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>📝 Exam Results</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage exam results and grades</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#6366f1", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Result</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Results", val: results.length, color: "#6366f1" }, { label: "Pass", val: passCount, color: "#34d399" }, { label: "Fail", val: results.length - passCount, color: "#ef4444" }, { label: "Avg Score", val: `${avgPct}%`, color: "#f59e0b" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Student", "Roll No", "Class", "Exam", "Marks", "Percentage", "Grade", "Result"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {results.map(r => (
              <tr key={r.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{r.student}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{r.rollNo}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{r.class}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{r.examName}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{r.obtainedMarks}/{r.totalMarks}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600, color: r.percentage >= 50 ? "#34d399" : "#ef4444" }}>{r.percentage}%</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ fontWeight: 800, color: GRADE_COLOR[r.grade] || "#fff", fontSize: 16 }}>{r.grade}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: r.status === "pass" ? "rgba(52,211,153,.15)" : "rgba(239,68,68,.15)", color: r.status === "pass" ? "#34d399" : "#ef4444", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{r.status.toUpperCase()}</span>
                </td>
              </tr>
            ))}
            {!loading && results.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No exam results yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 480, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Exam Result</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Student Name", "student", "text", "span 2"], ["Roll No", "rollNo", "text", ""], ["Class", "class", "text", ""], ["Exam Name", "examName", "text", "span 2"]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Total Marks</label>
                <input type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Obtained Marks</label>
                <input type="number" value={form.obtainedMarks} onChange={e => setForm(f => ({ ...f, obtainedMarks: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {error && <div style={{ color: "#fda4af", fontSize: 12, flex: 1 }}>{error}</div>}
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save Result</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
