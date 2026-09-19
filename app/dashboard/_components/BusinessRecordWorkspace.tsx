"use client";
import { confirmToast } from "@/lib/toast-feedback";

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

/* Theme variables rather than hard-coded dark values.
   The shell around this workspace switches between light and dark; the panel
   inside it used to be painted in fixed whites-on-transparent, so in light mode
   the records read as white text on a white card. */
const panelBg = "var(--card-bg)";
const panelBorder = "var(--border)";
const inputBg = "var(--input-bg)";
const textPrimary = "var(--text-primary)";
const textMuted = "var(--text-muted)";

/* Hover, sticky cells and the scrollbar need real CSS — a :hover or a
   ::-webkit-scrollbar cannot be written as an inline style. */
const workspaceCss = `
.sba-scroll{overflow:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
.sba-scroll::-webkit-scrollbar{height:9px;width:9px}
.sba-scroll::-webkit-scrollbar-track{background:transparent}
.sba-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
.sba-scroll::-webkit-scrollbar-thumb:hover{background:var(--text-muted)}
.sba-table{width:100%;min-width:max-content;border-collapse:separate;border-spacing:0}
.sba-table thead th{position:sticky;top:0;z-index:2;background:var(--card-bg)}
.sba-table th.sba-sticky{right:0;z-index:3}
.sba-table td.sba-sticky{position:sticky;right:0;z-index:1;background:var(--card-bg)}
.sba-table td.sba-sticky::before,.sba-table th.sba-sticky::before{content:"";position:absolute;left:0;top:0;bottom:0;width:18px;transform:translateX(-100%);pointer-events:none;background:linear-gradient(to right,rgba(0,0,0,0),rgba(0,0,0,.18))}
.sba-table tbody tr:hover td{background:var(--panel-bg-2)}
.sba-table tbody tr:last-child td{border-bottom:none}
`;

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

  const { isMobile, isTablet } = useResponsive();
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

  /* The controls of one row — the status box, the page's own actions, Delete.
     Shared, because the wide screen shows them in the last table cell and the
     narrow one shows them at the foot of a card, and they must not drift
     apart. */
  function renderRowControls(row: Record<string, unknown>, justify: "flex-end" | "flex-start") {
    const rowId = String(row.id);
    const rowStatus = String(row.status ?? "");
    return (
      <div style={{ display: "flex", gap: 6, justifyContent: justify, alignItems: "center", flexWrap: isMobile ? "wrap" : "nowrap" }}>
        {/* One box instead of three pills.

            Every row carried a button per status it was not currently in —
            "booked", "issued", "refunded" — so a five-status record grew five
            controls before the real actions even started. A status is one
            value out of a known list, which is a dropdown; and this way the
            row also shows what the status IS, which the pills never did. */}
        {statusOptions.length > 0 && (
          <select
            value={rowStatus}
            onChange={(event) => handleStatusChange(rowId, event.target.value)}
            style={{
              borderRadius: 999,
              border: `1px solid ${accent}44`,
              background: `${accent}14`,
              color: accent,
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 8px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {/* The current one first, even where it is not a listed option — a
                record set to something retired should still read back honestly
                rather than showing the first option as though it were true. */}
            {!statusOptions.includes(rowStatus) && rowStatus && (
              <option value={rowStatus}>{rowStatus}</option>
            )}
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
        {actions
          .filter((action) => !action.hidden?.(row))
          .map((action) => {
            const label = typeof action.label === "function" ? action.label(row) : action.label;
            const busy = actionKey === `${rowId}:${label}`;
            const tone =
              action.tone === "success"
                ? { border: "1px solid rgba(52,211,153,.35)", background: "rgba(52,211,153,.12)", color: "#34d399" }
                : action.tone === "neutral"
                  ? { border: `1px solid ${panelBorder}`, background: "var(--panel-bg)", color: textPrimary }
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
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
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
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    /* maxWidth + overflow hidden on the page root, and minmax(0,…) on every
       track below, because a grid or flex track is min-content wide by default
       — a table of eleven nowrap columns therefore pushed this whole page
       wider than the window and the right-hand buttons ended up off-screen. */
    <div style={{ padding: isMobile ? "16px" : "28px 32px", fontFamily: shellFont, color: textPrimary, maxWidth: "100%", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: workspaceCss }} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: isMobile ? 20 : 24, fontWeight: 800, color: textPrimary }}>{title}</h1>
          <p style={{ margin: 0, fontSize: 14, color: textMuted }}>{subtitle}</p>
        </div>
        <div style={{ flex: "0 1 320px", minWidth: 220, display: "grid", gap: 10 }}>
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
              color: textPrimary,
              fontSize: 13,
              fontFamily: "inherit",
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
                color: textPrimary,
                fontSize: 13,
                fontFamily: "inherit",
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 24 }}>
        {summaries.map((card) => (
          <div key={card.label} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "16px 18px", minWidth: 0 }}>
            <div style={{ fontSize: 11, color: textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Below a laptop width the form sits above the records instead of beside
          them: 340px of form plus a wide table in what is left is what pushed
          the table off the screen on a tablet. */}
      <div style={{ display: "grid", gridTemplateColumns: isTablet ? "minmax(0,1fr)" : "minmax(280px,340px) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <form onSubmit={handleCreate} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 20, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 14 }}>Create Record</div>
          <div style={{ display: "grid", gridTemplateColumns: isTablet && !isMobile ? "repeat(auto-fit,minmax(220px,1fr))" : "minmax(0,1fr)", gap: 12 }}>
            {fields.map((field) => (
              <label key={field.key} style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>{field.label}</span>
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
                        color: textPrimary,
                        fontSize: 13,
                        fontFamily: "inherit",
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
                          color: textPrimary,
                          fontSize: 13,
                          fontFamily: "inherit",
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
                      color: textPrimary,
                      fontSize: 13,
                      fontFamily: "inherit",
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
                        color: textPrimary,
                        fontSize: 13,
                        fontFamily: "inherit",
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
              fontFamily: "inherit",
            }}
          >
            {saving ? "Saving..." : "Save Record"}
          </button>
        </form>

        <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: isMobile ? 14 : 18, minWidth: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Live Records</div>
            <div style={{ fontSize: 12, color: textMuted, whiteSpace: "nowrap" }}>{filteredRows.length} shown</div>
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: textMuted }}>Loading records...</div>
          ) : !filteredRows.length ? (
            <div style={{ fontSize: 13, color: textMuted }}>{emptyState}</div>
          ) : isMobile ? (
            /* A card per record on a phone.

               A ten-column table on a 390px screen is a table nobody can read:
               either it is crushed or it is a sideways scroll where the column
               you are reading has scrolled its heading away. A card names each
               value beside it and needs no horizontal scroll at all. */
            <div style={{ display: "grid", gap: 10 }}>
              {filteredRows.map((row) => (
                <div
                  key={String(row.id)}
                  style={{
                    border: `1px solid ${panelBorder}`,
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--panel-bg)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    {columns.map((column) => (
                      <div key={column.key} style={{ display: "flex", gap: 10, alignItems: "baseline", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10.5, color: textMuted, textTransform: "uppercase", letterSpacing: ".05em", flexShrink: 0 }}>
                          {column.label}
                        </span>
                        <span style={{ fontSize: 13, color: textPrimary, textAlign: "right", overflowWrap: "anywhere" }}>
                          {column.render ? column.render(row) : formatCellValue(row[column.key])}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${panelBorder}`, paddingTop: 8 }}>
                    {renderRowControls(row, "flex-start")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* The table scrolls inside its own panel rather than crushing the
               words or dragging the page sideways.

               Headings stay put at the top and the controls column stays put at
               the right, so a wide record can be scrolled through without
               losing either the name of the column being read or the buttons
               that act on the row. */
            <div className="sba-scroll" style={{ maxHeight: "min(68vh, 640px)", borderRadius: 12, border: `1px solid ${panelBorder}` }}>
              <table className="sba-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        style={{
                          textAlign: "left",
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: textMuted,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                          padding: "11px 14px",
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
                      className="sba-sticky"
                      style={{
                        textAlign: "right",
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: textMuted,
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "11px 14px",
                        whiteSpace: "nowrap",
                        borderBottom: `1px solid ${panelBorder}`,
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={String(row.id)}>
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          style={{
                            padding: "12px 14px",
                            borderBottom: `1px solid ${panelBorder}`,
                            fontSize: 13,
                            color: textPrimary,
                            // A name is one thing, so it stays on one line.
                            whiteSpace: "nowrap",
                          }}
                        >
                          {column.render ? column.render(row) : formatCellValue(row[column.key])}
                        </td>
                      ))}
                      <td
                        className="sba-sticky"
                        style={{ padding: "12px 14px", borderBottom: `1px solid ${panelBorder}`, whiteSpace: "nowrap" }}
                      >
                        {renderRowControls(row, "flex-end")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
