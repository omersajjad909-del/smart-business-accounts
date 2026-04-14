"use client";
import { useState } from "react";

const ROLES = [
  { value: "ADMIN", label: "Admin", color: "#7c3aed" },
  { value: "MANAGER", label: "Manager", color: "#0891b2" },
  { value: "ACCOUNTANT", label: "Accountant", color: "#0d9488" },
  { value: "HR_MANAGER", label: "HR Manager", color: "#d97706" },
  { value: "SALES", label: "Sales Executive", color: "#2563eb" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager", color: "#16a34a" },
  { value: "CASHIER", label: "Cashier", color: "#9333ea" },
  { value: "AUDITOR", label: "Auditor", color: "#dc2626" },
  { value: "SECURITY", label: "Security / Gate", color: "#64748b" },
  { value: "VIEWER", label: "Viewer (Read Only)", color: "#6b7280" },
];

export default function TeamPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, name: name || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Invitation sent successfully!" });
        setEmail("");
        setName("");
        setRole("VIEWER");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to send invite" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error" });
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = ROLES.find((r) => r.value === role);

  return (
    <div style={{ padding: "32px", maxWidth: "680px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Invite Team Member
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          Send an invitation to add a new member to your team.
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "28px",
        }}
      >
        <form onSubmit={inviteUser}>
          {/* Name + Email row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Full Name <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--app-bg)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Email Address <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--app-bg)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Role */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Role
            </label>
            {/* Role grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "8px",
              }}
            >
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${role === r.value ? r.color : "var(--border)"}`,
                    background: role === r.value ? r.color + "14" : "var(--app-bg)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    style={{ display: "none" }}
                  />
                  {/* Color dot */}
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: r.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: role === r.value ? 600 : 400,
                      color: role === r.value ? r.color : "var(--text-primary)",
                    }}
                  >
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Selected role info banner */}
          {selectedRole && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "8px",
                background: selectedRole.color + "12",
                border: `1px solid ${selectedRole.color}30`,
                marginBottom: "24px",
              }}
            >
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: selectedRole.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {selectedRole.label[0]}
              </span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: selectedRole.color }}>
                  {selectedRole.label}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                  {getRoleDescription(selectedRole.value)}
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "8px",
              background: loading || !email ? "var(--border)" : "#6366f1",
              color: loading || !email ? "var(--text-muted)" : "#fff",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              cursor: loading || !email ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Sending Invite…" : "Send Invitation"}
          </button>
        </form>

        {/* Message */}
        {message && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              borderRadius: "8px",
              background: message.type === "success" ? "#16a34a14" : "#ef444414",
              border: `1px solid ${message.type === "success" ? "#16a34a40" : "#ef444440"}`,
              color: message.type === "success" ? "#16a34a" : "#ef4444",
              fontSize: "13px",
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            {message.type === "success" ? "✓ " : "✗ "}
            {message.text}
          </div>
        )}
      </div>

      {/* Info card */}
      <div
        style={{
          marginTop: "16px",
          padding: "16px 20px",
          borderRadius: "10px",
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "18px", flexShrink: 0 }}>ℹ️</span>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.6" }}>
          The invited member will receive an email with a link to set their password and join your workspace.
          Roles define what the member can see and do. You can change roles anytime from the{" "}
          <span style={{ color: "#6366f1", fontWeight: 500 }}>Users Management</span> page.
        </div>
      </div>
    </div>
  );
}

function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    ADMIN: "Full access to all features, settings, and user management.",
    MANAGER: "Manage operations, approve transactions, and view reports.",
    ACCOUNTANT: "Access to accounting, invoices, expenses, and financial reports.",
    HR_MANAGER: "Manage employees, payroll, and HR-related data.",
    SALES: "Create sales orders, manage customers, and view sales reports.",
    INVENTORY_MANAGER: "Manage inventory, stock, items, and purchase orders.",
    CASHIER: "Process payments, receipts, and basic transactions.",
    AUDITOR: "Read-only access to financial data and audit logs.",
    SECURITY: "Gate and visitor management access only.",
    VIEWER: "Read-only access to dashboards and basic reports.",
  };
  return descriptions[role] || "Standard role access.";
}
