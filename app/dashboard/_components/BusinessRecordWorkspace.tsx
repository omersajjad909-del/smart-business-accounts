"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useMemo, useState } from "react";
import { useBusinessRecords, type BusinessRecord } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";

type FormField = {
  key: string;
  label: string;
  /**
   * "party" is a select of accounts that already exist, with "+ New…" at the
   * foot for one that does not — see the renderer. Everything else is a plain
   * input of that type.
   */
  type?: "text" | "number" | "date" | "select" | "party";
  placeholder?: string;
  options?: string[];
  /**
   * Names offered as you type, without forcing the choice.
   *
   * For a field whose value is a party — an airline, an embassy, a hotel — the
   * chart of accounts already knows the ones this company deals with, and
   * re-typing them by hand is how "Qatar Airways BSP" and "Qatar Airways Bsp"
   * end up as two suppliers. A dropdown would fix the spelling and break the
   * first booking with a supplier nobody has set up yet.
   */
  suggestions?: string[];
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

type WorkspaceAction = {
  label: string | ((row: Record<string, unknown>) => string);
  tone?: "accent" | "success" | "neutral";
  hidden?: (row: Record<string, unknown>) => boolean;
  onClick: (
    row: Record<string, unknown>,
    helpers: { refetch: () => Promise<void>; setError: (message: string | null) => void },
  ) => Promise<void> | void;
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
  actions?: WorkspaceAction[];
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
  actions = [],
}: BusinessRecordWorkspaceProps) {
  const initialForm = useMemo(
    () =>
      fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = defaultValues[field.key] ?? "";
        return acc;
      }, {}),
    [defaultValues, fields],
  );

  const { isMobile } = useResponsive();
  const { records, loading, create, remove, setStatus, refetch } = useBusinessRecords(category);
  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

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

  async function handleAction(action: WorkspaceAction, row: Record<string, unknown>) {
    const nextActionKey = `${String(row.id)}:${typeof action.label === "function" ? action.label(row) : action.label}`;
    setActionKey(nextActionKey);
    setError(null);
    try {
      await action.onClick(row, { refetch, setError });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setActionKey(null);
    }
  }

  return (
    <div style={{ padding: isMobile ? "16px" : "28px 32px", fontFamily: shellFont, color: "#e2e8f0" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "340px 1fr", gap: 16, alignItems: "start" }}>
        <form onSubmit={handleCreate} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Create Record</div>
          <div style={{ display: "grid", gap: 12 }}>
            {fields.map((field) => (
              <label key={field.key} style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em" }}>{field.label}</span>
                {field.type === "party" ? (
                  /* A party picked from the accounts that already exist, with a
                     way out for one that does not.

                     A plain dropdown is what an operator asks for and it breaks
                     the first booking with a supplier nobody has set up — they
                     would have to abandon a half-typed ticket, go to Accounts,
                     add a row and come back. A plain text box is what was there
                     before and it is how "Qatar Airways BSP" and "Qatar Airways
                     Bsp" become two suppliers with half the payable each.

                     So: the list, and "+ New" at the foot of it. Choosing the
                     existing one is one click and always spelled the same way;
                     a new one is still possible without leaving the form. */
                  <>
                    <select
                      value={(field.options ?? []).includes(form[field.key] ?? "") || !form[field.key] ? (form[field.key] ?? "") : "__NEW__"}
                      onChange={(event) => {
                        const picked = event.target.value;
                        setForm((current) => ({
                          ...current,
                          // "+ New" clears the box rather than storing the
                          // sentinel, so the text input opens empty.
                          [field.key]: picked === "__NEW__" ? "" : picked,
                          [`__new_${field.key}`]: picked === "__NEW__" ? "1" : "",
                        }));
                      }}
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
                        <option key={option} value={option}>{option}</option>
                      ))}
                      <option value="__NEW__">+ New…</option>
                    </select>
                    {(form[`__new_${field.key}`] === "1" || (form[field.key] && !(field.options ?? []).includes(form[field.key]))) && (
                      <input
                        autoFocus
                        value={form[field.key] ?? ""}
                        placeholder={field.placeholder}
                        onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                        style={{
                          width: "100%",
                          marginTop: 6,
                          background: inputBg,
                          border: `1px solid ${panelBorder}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                          color: "#fff",
                          fontSize: 13,
                        }}
                      />
                    )}
                  </>
                ) : field.type === "select" ? (
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
                  <>
                    <input
                      type={field.type ?? "text"}
                      required={field.required}
                      value={form[field.key] ?? ""}
                      placeholder={field.placeholder}
                      /* Suggestions rather than a dropdown. The names come from
                         the chart of accounts, so the ones already set up are
                         one keystroke away and spelled the same way every time
                         — but a supplier being used for the first time can
                         still simply be typed, and the posting creates the
                         account. A hard dropdown would send the operator off
                         to Accounts mid-booking to add a row. */
                      list={field.suggestions?.length ? `${field.key}-suggestions` : undefined}
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
                    {field.suggestions?.length ? (
                      <datalist id={`${field.key}-suggestions`}>
                        {field.suggestions.map((s) => <option key={s} value={s} />)}
                      </datalist>
                    ) : null}
                  </>
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
            /* The table scrolls rather than crushes.

               It had no column padding and no minimum width, so eleven columns
               in a narrow panel ran their headings together — "BOOKINGPASSENGER
               AIRLINE" as one word — and wrapped "Qatar Airways" onto two lines
               as "Qatar Air / Ways". A table that cannot fit should be scrolled
               sideways, which everyone understands, not squeezed until the words
               break. */
            <div style={{ overflowX: "auto", margin: "0 -4px" }}>
              <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        style={{
                          textAlign: "left",
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: "rgba(255,255,255,.4)",
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                          padding: "0 14px 10px 0",
                          // Headings never wrap. A two-line heading is what made
                          // the row above unreadable.
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${panelBorder}`,
                        }}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th
                      style={{
                        textAlign: "right",
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: "rgba(255,255,255,.4)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "0 0 10px 14px",
                        whiteSpace: "nowrap",
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
                          <td
                            key={column.key}
                            style={{
                              padding: "12px 14px 12px 0",
                              borderBottom: `1px solid rgba(255,255,255,.05)`,
                              fontSize: 13,
                              color: "rgba(255,255,255,.78)",
                              // A name is one thing, so it stays on one line.
                              whiteSpace: "nowrap",
                            }}
                          >
                            {column.render ? column.render(row) : formatCellValue(row[column.key])}
                          </td>
                        ))}
                        {/* Actions kept on one line and pushed right, so the
                            row reads as data with its controls at the end
                            rather than as two piles of pills. */}
                        <td style={{ padding: "12px 0 12px 14px", borderBottom: `1px solid rgba(255,255,255,.05)`, whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
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
                            {actions
                              .filter((action) => !action.hidden?.(row))
                              .map((action) => {
                                const label = typeof action.label === "function" ? action.label(row) : action.label;
                                const busy = actionKey === `${rowId}:${label}`;
                                const tone =
                                  action.tone === "success"
                                    ? { border: "1px solid rgba(52,211,153,.35)", background: "rgba(52,211,153,.12)", color: "#34d399" }
                                    : action.tone === "neutral"
                                      ? { border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#e2e8f0" }
                                      : { border: `1px solid ${accent}55`, background: `${accent}18`, color: accent };

                                return (
                                  <button
                                    key={label}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleAction(action, row)}
                                    style={{
                                      borderRadius: 999,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: "5px 10px",
                                      cursor: busy ? "wait" : "pointer",
                                      opacity: busy ? 0.7 : 1,
                                      ...tone,
                                    }}
                                  >
                                    {busy ? "Working..." : label}
                                  </button>
                                );
                              })}
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
