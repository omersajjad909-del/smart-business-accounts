"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`n
import { useMemo, useState } from "react";
import { useBusinessRecords, type BusinessRecord } from "@/lib/useBusinessRecords";

type FormField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

type WorkspaceColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

type SummaryCard = {
  label: string;
  value: string | number;
  color: string;
};

type BusinessRecordWorkspaceProps = {
  title: string;
  subtitle: string;
  accent: string;
  category: string;
  emptyState: string;
  fields: FormField[];
  defaultValues?: Record<string, string>;
  columns: WorkspaceColumn[];
  statusOptions?: string[];
  mapRecord: (record: BusinessRecord) => Record<string, unknown>;
  buildCreatePayload: (form: Record<string, string>) => {
    title: string;
    status?: string;
    data: Record<string, unknown>;
    amount?: number;
    date?: string;
  };
  summarize: (rows: Record<string, unknown>[]) => SummaryCard[];
};

const shellFont = "'Outfit','Inter',sans-serif";
const panelBg = "rgba(255,255,255,.03)";
const panelBorder = "rgba(255,255,255,.07)";
const inputBg = "rgba(15,23,42,.72)";

function formatCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "-";
  return String(value);
}

export function BusinessRecordWorkspace({
  title,
  subtitle,
  accent,
  category,
  emptyState,
  fields,
  defaultValues = {},
  columns,
  statusOptions = [],
  mapRecord,
  buildCreatePayload,
  summarize,
}: BusinessRecordWorkspaceProps) {
  const initialForm = useMemo(
    () =>
      fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = defaultValues[field.key] ?? "";
        return acc;
      }, {}),
    [defaultValues, fields],
  );

  const { records, loading, create, remove, setStatus } = useBusinessRecords(category);
  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => records.map(mapRecord), [mapRecord, records]);
  const summaries = useMemo(() => summarize(rows), [rows, summarize]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const haystack = Object.values(row)
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      const rowStatus = String(row.status ?? "").toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || rowStatus === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await create(buildCreatePayload(form));
      setForm(initialForm);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to save record");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this record?")) return;
    try {
      await remove(id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete record");
    }
  }

  async function handleStatusChange(id: string, nextStatus: string) {
    try {
      await setStatus(id, nextStatus);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update status");
    }
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: shellFont, color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>{title}</h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>{subtitle}</p>
        </div>
        <div style={{ minWidth: 260, display: "grid", gap: 10 }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search records"
            style={{
              width: "100%",
              background: inputBg,
              border: `1px solid ${panelBorder}`,
              borderRadius: 10,
              padding: "10px 12px",
              color: "#fff",
              fontSize: 13,
            }}
          />
          {statusOptions.length ? (
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                width: "100%",
                background: inputBg,
                border: `1px solid ${panelBorder}`,
                borderRadius: 10,
                padding: "10px 12px",
                color: "#fff",
                fontSize: 13,
              }}
            >
              <option value="all">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {summaries.map((card) => (
          <div key={card.label} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
        <form onSubmit={handleCreate} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Create Record</div>
          <div style={{ display: "grid", gap: 12 }}>
            {fields.map((field) => (
              <label key={field.key} style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em" }}>{field.label}</span>
                {field.type === "select" ? (
                  <select
                    value={form[field.key] ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    style={{
                      width: "100%",
                      background: inputBg,
                      border: `1px solid ${panelBorder}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      color: "#fff",
                      fontSize: 13,
                    }}
                  >
                    <option value="">Select {field.label}</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? "text"}
                    required={field.required}
                    value={form[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    style={{
                      width: "100%",
                      background: inputBg,
                      border: `1px solid ${panelBorder}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      color: "#fff",
                      fontSize: 13,
                    }}
                  />
                )}
              </label>
            ))}
          </div>
          {error ? <div style={{ marginTop: 12, fontSize: 12, color: "#f87171" }}>{error}</div> : null}
          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 16,
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: "12px 14px",
              background: accent,
              color: "#0f172a",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Record"}
          </button>
        </form>

        <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Live Records</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{filteredRows.length} shown</div>
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>Loading records...</div>
          ) : filteredRows.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        style={{
                          textAlign: "left",
                          fontSize: 11,
                          color: "rgba(255,255,255,.45)",
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                          padding: "0 0 10px",
                          borderBottom: `1px solid ${panelBorder}`,
                        }}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th
                      style={{
                        textAlign: "left",
                        fontSize: 11,
                        color: "rgba(255,255,255,.45)",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        padding: "0 0 10px",
                        borderBottom: `1px solid ${panelBorder}`,
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const rowId = String(row.id);
                    const rowStatus = String(row.status ?? "");
                    return (
                      <tr key={rowId}>
                        {columns.map((column) => (
                          <td key={column.key} style={{ padding: "14px 8px 14px 0", borderBottom: `1px solid rgba(255,255,255,.04)`, fontSize: 13, color: "rgba(255,255,255,.78)" }}>
                            {column.render ? column.render(row) : formatCellValue(row[column.key])}
                          </td>
                        ))}
                        <td style={{ padding: "14px 0", borderBottom: `1px solid rgba(255,255,255,.04)` }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {statusOptions
                              .filter((option) => option !== rowStatus)
                              .slice(0, 3)
                              .map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleStatusChange(rowId, option)}
                                  style={{
                                    borderRadius: 999,
                                    border: `1px solid ${accent}55`,
                                    background: `${accent}18`,
                                    color: accent,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "5px 10px",
                                    cursor: "pointer",
                                  }}
                                >
                                  {option}
                                </button>
                              ))}
                            <button
                              type="button"
                              onClick={() => handleDelete(rowId)}
                              style={{
                                borderRadius: 999,
                                border: "1px solid rgba(248,113,113,.35)",
                                background: "rgba(248,113,113,.12)",
                                color: "#f87171",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "5px 10px",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>{emptyState}</div>
          )}
        </div>
      </div>
    </div>
  );
}
