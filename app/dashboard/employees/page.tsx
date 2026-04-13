"use client";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
const accent = "#818cf8";

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designations: string;
  department: string;
  dateOfJoining: string;
  salary: number;
  salaryFrequency: string;
  isActive: boolean;
}

const DEPARTMENTS = ["ACCOUNTS","GODOWN","HR","OPERATIONS","GATE","SECURITY","SALES","IT"];
const FREQ_LABEL: Record<string, string> = { MONTHLY: "Monthly", WEEKLY: "Weekly", HOURLY: "Hourly" };
const EMPTY_FORM = {
  employeeId: "", firstName: "", lastName: "", email: "",
  phone: "", designations: "", department: "",
  dateOfJoining: new Date().toISOString().slice(0, 10),
  salary: 0, salaryFrequency: "MONTHLY",
};

function authHeaders() {
  const user = getCurrentUser();
  return {
    ...(user?.role      ? { "x-user-role":  user.role }      : {}),
    ...(user?.id        ? { "x-user-id":    user.id }        : {}),
    ...(user?.companyId ? { "x-company-id": user.companyId } : {}),
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [editing,   setEditing]   = useState<string | null>(null);
  const [showForm,  setShowForm]  = useState(false);
  const [formData,  setFormData]  = useState(EMPTY_FORM);

  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const res  = await fetch("/api/employees", { headers: authHeaders() });
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url    = editing ? `/api/employees?id=${editing}` : "/api/employees";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...formData, salary: parseFloat(formData.salary.toString()) }),
      });
      if (res.ok) { fetchEmployees(); resetForm(); setShowForm(false); }
      else { const err = await res.json(); toast.error(err.error || "Failed to save employee"); }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this employee?")) return;
    try {
      await fetch(`/api/employees?id=${id}`, { method: "DELETE", headers: authHeaders() });
      fetchEmployees();
    } catch { /* silent */ }
  }

  function handleEdit(emp: Employee) {
    setEditing(emp.id);
    setFormData({
      employeeId: emp.employeeId, firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone || "", designations: emp.designations,
      department: emp.department, dateOfJoining: emp.dateOfJoining.split("T")[0],
      salary: emp.salary, salaryFrequency: emp.salaryFrequency,
    });
    setShowForm(true);
  }

  function resetForm() { setFormData(EMPTY_FORM); setEditing(null); }

  const inp: React.CSSProperties = {
    padding: "10px 12px", borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--app-bg)",
    color: "var(--text-primary)",
    fontSize: 13, fontFamily: ff, outline: "none",
    width: "100%", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: ".05em",
    display: "block", marginBottom: 6,
  };

  return (
    <div style={{ padding: "28px 24px", minHeight: "100%", background: "var(--app-bg)", fontFamily: ff, color: "var(--text-primary)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: accent, margin: "0 0 4px" }}>Employees</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              Manage your workforce — {employees.length} employee{employees.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(v => !v); }}
            style={{
              padding: "10px 18px", borderRadius: 12, border: "none", fontFamily: ff,
              background: showForm && !editing ? "var(--panel-bg)" : accent,
              color: showForm && !editing ? "var(--text-muted)" : "white",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            {showForm && !editing ? "Cancel" : "+ Add Employee"}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ borderRadius: 16, background: "var(--panel-bg)", border: "1px solid var(--border)", padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 18px" }}>
              {editing ? "Edit Employee" : "New Employee"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
                {[
                  { key: "employeeId",   label: "Employee ID",  type: "text",  req: true  },
                  { key: "firstName",    label: "First Name",   type: "text",  req: true  },
                  { key: "lastName",     label: "Last Name",    type: "text",  req: false },
                  { key: "email",        label: "Email",        type: "email", req: true  },
                  { key: "phone",        label: "Phone",        type: "tel",   req: false },
                  { key: "designations", label: "Designation",  type: "text",  req: false },
                ].map(({ key, label, type, req }) => (
                  <div key={key}>
                    <label style={lbl}>{label}{req ? " *" : ""}</label>
                    <input
                      type={type}
                      value={(formData as any)[key]}
                      onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                      required={req}
                      style={inp}
                    />
                  </div>
                ))}

                <div>
                  <label style={lbl}>Department *</label>
                  <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} required style={inp}>
                    <option value="">Select…</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>

                <div>
                  <label style={lbl}>Date of Joining *</label>
                  <input type="date" value={formData.dateOfJoining} onChange={e => setFormData({ ...formData, dateOfJoining: e.target.value })} required style={inp} />
                </div>

                <div>
                  <label style={lbl}>Salary</label>
                  <input type="number" value={formData.salary} onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })} style={inp} />
                </div>

                <div>
                  <label style={lbl}>Frequency</label>
                  <select value={formData.salaryFrequency} onChange={e => setFormData({ ...formData, salaryFrequency: e.target.value })} style={inp}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="HOURLY">Hourly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={loading}
                  style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", fontFamily: ff,
                    background: loading ? `${accent}66` : accent,
                    color: "white", fontSize: 14, fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Saving…" : editing ? "Update Employee" : "Add Employee"}
                </button>
                {editing && (
                  <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
                    style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid var(--border)",
                      background: "var(--app-bg)", color: "var(--text-muted)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        {loading && employees.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ borderRadius: 16, background: "var(--panel-bg)", border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["ID", "Name", "Email", "Designation", "Department", "Salary", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700,
                      color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em",
                      background: "var(--panel-bg)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(128,128,128,0.05)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "13px 16px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12 }}>
                      {emp.employeeId}
                    </td>
                    <td style={{ padding: "13px 16px", fontWeight: 600 }}>{emp.firstName} {emp.lastName}</td>
                    <td style={{ padding: "13px 16px", color: "var(--text-muted)" }}>{emp.email}</td>
                    <td style={{ padding: "13px 16px", color: "var(--text-muted)" }}>{emp.designations || "—"}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, background: `${accent}18`, color: accent, fontSize: 11, fontWeight: 700 }}>
                        {emp.department}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", color: "var(--text-primary)", fontFamily: "monospace" }}>
                      {emp.salary.toLocaleString()}
                      <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>
                        / {FREQ_LABEL[emp.salaryFrequency] || emp.salaryFrequency}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <button onClick={() => handleEdit(emp)}
                        style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${accent}40`,
                          background: `${accent}12`, color: accent, fontSize: 12, fontWeight: 600,
                          cursor: "pointer", marginRight: 8, fontFamily: ff }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(emp.id)}
                        style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(248,113,113,.25)",
                          background: "rgba(248,113,113,.1)", color: "#f87171", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: ff }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      No employees yet. Click <strong>+ Add Employee</strong> to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
