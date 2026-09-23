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
  /**
   * A way in that is better than the form beside the list.
   *
   * Some desks have a proper flow for creating a record — a travel booking is
   * a flight, a party of passengers and a fare, not nine boxes typed in one
   * go. Where that exists, it is offered at the top of the page and the quick
   * form stays for the operator who already has every value in front of them.
   */
  headerAction?: { label: string; href: string };
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

/* Hover and the status pill's native arrow need real CSS — a :hover or an
   appearance reset cannot be written as an inline style. */
const workspaceCss = `
.sba-card{transition:border-color .15s,box-shadow .15s,transform .15s}
.sba-card:hover{border-color:var(--text-muted);box-shadow:var(--shadow)}
.sba-status{appearance:none;-webkit-appearance:none;background-image:none}
.sba-act{transition:filter .15s}
.sba-act:hover:not(:disabled){filter:brightness(1.18)}
`;

/* What a status means, in colour.

   The word itself is written by whichever vertical owns the record — a ticket
   is "issued", a job is "completed", an invoice is "overdue" — so the tone is
   read from the word rather than configured per page. Anything unrecognised
   falls back to the page's own accent, which is never wrong, only neutral. */
function statusTone(status: string, accent: string) {
  const value = status.toLowerCase();
  if (/(issued|paid|settled|complete|completed|approved|active|delivered|closed|done|received)/.test(value)) return "#34d399";
  if (/(quoted|pending|draft|hold|on hold|await|awaiting|open|new)/.test(value)) return "#fbbf24";
  if (/(refund|refunded|void|cancel|cancelled|reject|rejected|failed|overdue|expired)/.test(value)) return "#f87171";
  if (/(booked|confirmed|progress|in progress|partial|sent|shipped|scheduled)/.test(value)) return "#60a5fa";
  return accent;
}

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
  headerAction,
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
  /* The nine-box form used to sit open beside the records on every one of
     these desks. On a page whose main action is a wizard — "Book a Flight" —
     that is two ways in shouting at each other, and the operator has to work
     out which one is the real one before doing anything. So it opens when it
     is asked for, and where there is no wizard it stays open, because then it
     IS the way in. */
  const [formOpen, setFormOpen] = useState(!headerAction);
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


  /* The status of a record, as a pill you can change.

     A status is one value out of a known list, so it is a dropdown; and
     showing it where the eye lands first — beside the record's own name —
     means the row reads as "TRV-011, quoted" rather than making you hunt for a
     control at the far right of a scrolling table. */
  function renderStatusPill(row: Record<string, unknown>) {
    const rowId = String(row.id);
    const rowStatus = String(row.status ?? "");
    if (!statusOptions.length) {
      return rowStatus ? (
        <span style={{ fontSize: 11.5, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: ".04em" }}>{rowStatus}</span>
      ) : null;
    }
    const tone = statusTone(rowStatus, accent);
    return (
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
        <select
          className="sba-status"
          value={rowStatus}
          onChange={(event) => handleStatusChange(rowId, event.target.value)}
          style={{
            borderRadius: 999,
            border: `1px solid ${tone}55`,
            background: `${tone}1f`,
            color: tone,
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            padding: "6px 26px 6px 12px",
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
        <span aria-hidden style={{ position: "absolute", right: 11, fontSize: 8, color: tone, pointerEvents: "none" }}>▼</span>
      </span>
    );
  }

  /* The page's own actions, on their own line at the foot of the card.

     They used to ride in the last cell of the table, which on a wide record
     meant a block of buttons pinned over the columns it was supposed to sit
     beside. A record and the things you can do to it are two different kinds
     of thing, so they get two different rows. */
  function renderActions(row: Record<string, unknown>) {
    const rowId = String(row.id);
    const visible = actions.filter((action) => !action.hidden?.(row));
    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "flex-end",
          borderTop: `1px solid ${panelBorder}`,
          paddingTop: 12,
          marginTop: 2,
        }}
      >
        {visible.map((action) => {
          const label = typeof action.label === "function" ? action.label(row) : action.label;
          const busy = actionKey === `${rowId}:${label}`;
          const tone =
            action.tone === "success"
              ? { border: "1px solid rgba(52,211,153,.45)", background: "rgba(52,211,153,.14)", color: "#34d399" }
              : action.tone === "neutral"
                ? { border: `1px solid ${panelBorder}`, background: "var(--panel-bg)", color: textPrimary }
                : { border: `1px solid ${accent}66`, background: `${accent}1f`, color: accent };

          return (
            <button
              key={label}
              className="sba-act"
              type="button"
              disabled={busy}
              onClick={() => handleAction(action, row)}
              style={{
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 14px",
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
        {/* Destructive, so it sits apart from the things you do on purpose
            every day and is never the button next to the one you wanted. */}
        <button
          className="sba-act"
          type="button"
          onClick={() => handleDelete(rowId)}
          style={{
            marginLeft: visible.length && !isMobile ? 4 : 0,
            borderRadius: 10,
            border: "1px solid transparent",
            background: "transparent",
            color: "#f87171",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 12px",
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

  /* One record, one card.

     Ten columns of a travel booking never fitted a table on any screen anyone
     actually uses: either the words were crushed together, or the table was
     scrolled sideways and the heading of the column being read had scrolled
     away with it. A card gives the record a name you can see, its values each
     labelled beside them, and its buttons at the foot — and it needs no
     horizontal scroll at any width. */
  function renderCard(row: Record<string, unknown>) {
    const [titleColumn, subtitleColumn] = columns;
    const detailColumns = columns.filter((column, index) => {
      if (index === 0) return false;
      if (index === 1 && subtitleColumn) return false;
      // The status is already the pill in the header.
      if (column.key === "status" && statusOptions.length) return false;
      return true;
    });

    const titleValue = titleColumn
      ? (titleColumn.render ? titleColumn.render(row) : formatCellValue(row[titleColumn.key]))
      : null;
    const subtitleValue = subtitleColumn
      ? (subtitleColumn.render ? subtitleColumn.render(row) : formatCellValue(row[subtitleColumn.key]))
      : null;

    return (
      <article
        key={String(row.id)}
        className="sba-card"
        style={{
          border: `1px solid ${panelBorder}`,
          borderRadius: 14,
          background: "var(--panel-bg)",
          padding: isMobile ? 14 : 16,
          display: "grid",
          gap: 14,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: textPrimary, lineHeight: 1.25, overflowWrap: "anywhere" }}>
              {titleValue}
            </div>
            {subtitleColumn ? (
              <div style={{ fontSize: 13, color: textMuted, marginTop: 3, overflowWrap: "anywhere" }}>
                <span style={{ textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10.5, marginRight: 6 }}>
                  {subtitleColumn.label}
                </span>
                {subtitleValue}
              </div>
            ) : null}
          </div>
          {renderStatusPill(row)}
        </div>

        {detailColumns.length ? (
          <div
            style={{
              display: "grid",
              // Auto-fit rather than a fixed count: the same card is tidy in a
              // narrow panel beside the form and in a wide one without it.
              gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 130 : 150}px,1fr))`,
              gap: "12px 16px",
            }}
          >
            {detailColumns.map((column) => (
              <div key={column.key} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                  {column.label}
                </div>
                <div style={{ fontSize: 13.5, color: textPrimary, fontWeight: 600, overflowWrap: "anywhere" }}>
                  {column.render ? column.render(row) : formatCellValue(row[column.key])}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {renderActions(row)}
      </article>
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
          {headerAction ? (
            <a
              href={headerAction.href}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: "linear-gradient(135deg,var(--accent),var(--accent-strong))",
                color: "#06121f", borderRadius: 10, padding: "11px 14px",
                fontSize: 13, fontWeight: 800, textDecoration: "none",
              }}
            >
              {headerAction.label}
            </a>
          ) : null}
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
          them: 340px of form plus the records in what is left is what pushed
          the records off the screen on a tablet. */}
      <div style={{ display: "grid", gridTemplateColumns: isTablet || !formOpen ? "minmax(0,1fr)" : "minmax(280px,340px) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        {formOpen ? (
        <form onSubmit={handleCreate} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 20, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Create Record</div>
            {headerAction ? (
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                style={{ border: "none", background: "transparent", color: textMuted, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", padding: 0 }}
              >
                Close
              </button>
            ) : null}
          </div>
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
        ) : null}

        <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: isMobile ? 14 : 18, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Live Records</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* The second way in, said once and quietly, rather than a whole
                  form competing with the wizard above. */}
              {!formOpen ? (
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  style={{
                    border: `1px dashed ${panelBorder}`, background: "transparent", color: accent,
                    borderRadius: 9, padding: "5px 11px", fontSize: 11.5, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  }}
                >
                  + Enter one by hand
                </button>
              ) : null}
              <div style={{ fontSize: 12, color: textMuted, whiteSpace: "nowrap" }}>{filteredRows.length} shown</div>
            </div>
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: textMuted }}>Loading records...</div>
          ) : !filteredRows.length ? (
            <div style={{ fontSize: 13, color: textMuted }}>{emptyState}</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredRows.map((row) => renderCard(row))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
