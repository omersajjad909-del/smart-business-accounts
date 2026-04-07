"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Branch = {
  id: string;
  code: string;
  name: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active?: boolean;
};

type AdminControlSettings = {
  branchAssignments?: Record<string, string[]>;
};

export default function BranchUsersPage() {
  const user = getCurrentUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const headers: HeadersInit = {
          "x-user-role": user?.role || "ADMIN",
          "x-user-id": user?.id || "",
          "x-company-id": user?.companyId || "",
        };

        const [branchesRes, usersRes, controlRes] = await Promise.all([
          fetch("/api/branches", { headers, cache: "no-store" }),
          fetch("/api/users", { headers, cache: "no-store" }),
          fetch("/api/company/admin-control", { headers, cache: "no-store" }),
        ]);

        const [branchesData, usersData, controlData] = await Promise.all([
          branchesRes.json(),
          usersRes.json(),
          controlRes.json(),
        ]);

        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setAssignments((controlData as AdminControlSettings)?.branchAssignments || {});
      } catch {
        setBranches([]);
        setUsers([]);
        setAssignments({});
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.companyId, user?.id, user?.role]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((item) => !q || item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q) || item.role.toLowerCase().includes(q))
      .map((item) => {
        const branchIds = assignments[item.id] || [];
        const branchNames = branchIds.map((branchId) => branches.find((branch) => branch.id === branchId)?.name || branchId);
        return {
          ...item,
          branchCount: branchIds.length,
          branchNames,
        };
      });
  }, [assignments, branches, search, users]);

  const assignedUsers = rows.filter((row) => row.branchCount > 0).length;
  const unassignedUsers = rows.filter((row) => row.branchCount === 0).length;

  const shell = { fontFamily: "'Outfit','Inter',sans-serif" };
  const input = {
    padding: "10px 12px",
    background: "var(--app-bg)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--text-primary)",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ ...shell, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Branch Users</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Review branch-wise access for retail staff and jump into full user management when changes are needed.
          </p>
        </div>
        <Link
          href="/dashboard/users"
          style={{
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            color: "white",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Manage Users
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Branches", value: branches.length, color: "#818cf8" },
          { label: "Team Members", value: users.length, color: "#10b981" },
          { label: "Assigned Users", value: assignedUsers, color: "#f59e0b" },
          { label: "Needs Branch Setup", value: unassignedUsers, color: "#ef4444" },
        ].map((card) => (
          <div key={card.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{loading ? "..." : card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginBottom: 12 }}>Branches In Retail Network</div>
          {branches.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No branches configured yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {branches.map((branch) => (
                <div key={branch.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.14)" }}>
                  <div style={{ fontWeight: 700 }}>{branch.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{branch.code}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Branch Access Matrix</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, email, or role..."
              style={{ ...input, maxWidth: 280 }}
            />
          </div>

          <div style={{ overflow: "hidden", borderRadius: 12, border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,.06)" }}>
                  {["User", "Role", "Assigned Branches", "Coverage", "Status"].map((header) => (
                    <th key={header} style={{ padding: "11px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading branch users...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No branch user records found.</td></tr>
                ) : rows.map((row, index) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)", background: index % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600 }}>{row.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{row.email}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{row.role}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {row.branchNames.length > 0 ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {row.branchNames.map((branchName) => (
                            <span key={`${row.id}-${branchName}`} style={{ background: "rgba(99,102,241,.1)", color: "#818cf8", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {branchName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>No branch assignment</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700 }}>
                      {row.branchCount > 0 ? `${row.branchCount}/${branches.length || 0}` : "0"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          background: row.branchCount > 0 ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
                          color: row.branchCount > 0 ? "#10b981" : "#ef4444",
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {row.branchCount > 0 ? "Configured" : "Needs Setup"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
