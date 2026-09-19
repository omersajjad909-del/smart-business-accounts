"use client";

/**
 * What is about to go wrong, across every desk at once.
 *
 * Each desk already watches its own half of this. Nothing was looking across
 * all of them, and every item here is the same shape of problem: not a problem
 * today, expensive the week it lands. A passport with five months left, a
 * family flying Tuesday with no driver against their transfer, a trip
 * travelling Friday that nobody invoiced.
 *
 * Shows nothing at all when there is nothing wrong, which is the point — a
 * panel that is always shouting gets scrolled past.
 */

import { useEffect, useState } from "react";

import { T } from "./ui";

type Attention = {
  passportsExpiring: { count: number; rows: { id: string; name: string; passportNo: string | null; expiry: string | null; expired: boolean }[] };
  transfersWithoutDriver: { count: number; urgent: number; rows: { id: string; title: string; when: string; party: string; urgent: boolean }[] };
  insuranceCoverEnding: { count: number; rows: { id: string; title: string; traveler: string; coverTo: string }[] };
  trips: {
    unquoted: number;
    travellingSoon: number;
    travellingSoonUnpaid: number;
    rows: { id: string; bookingNo: string; customerName: string; status: string; travelDate: string | null; saleTotal: number; invoiceNo: string | null; quotationNo: string | null }[];
  };
};

function Group({
  tone,
  icon,
  title,
  href,
  children,
}: {
  tone: string;
  icon: string;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: `1px solid ${tone}44`, background: `${tone}0f`, borderRadius: 13, padding: 13, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: tone }}>{icon} {title}</span>
        <a href={href} style={{ fontSize: 11, color: T.accent, textDecoration: "none", whiteSpace: "nowrap" }}>Open →</a>
      </div>
      <div style={{ display: "grid", gap: 5 }}>{children}</div>
    </div>
  );
}

function Row({ left, right, tone }: { left: string; right: string; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 }}>
      <span style={{ color: T.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{left}</span>
      <span style={{ color: tone || T.muted, whiteSpace: "nowrap", fontWeight: tone ? 700 : 400 }}>{right}</span>
    </div>
  );
}

export function AttentionPanel() {
  const [data, setData] = useState<Attention | null>(null);

  useEffect(() => {
    fetch("/api/travel/attention")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => { if (body && !body.error) setData(body); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const groups: React.ReactNode[] = [];

  if (data.passportsExpiring.count) {
    groups.push(
      <Group key="pp" tone="#f87171" icon="🛂" title={`${data.passportsExpiring.count} passport${data.passportsExpiring.count === 1 ? "" : "s"} under six months`} href="/dashboard/travel/travelers">
        {data.passportsExpiring.rows.slice(0, 4).map((row) => (
          <Row
            key={row.id}
            left={`${row.name}${row.passportNo ? ` · ${row.passportNo}` : ""}`}
            right={row.expired ? "expired" : (row.expiry ?? "")}
            tone={row.expired ? "#f87171" : undefined}
          />
        ))}
      </Group>,
    );
  }

  if (data.transfersWithoutDriver.count) {
    groups.push(
      <Group key="tr" tone={data.transfersWithoutDriver.urgent ? "#f87171" : "#f4c25b"} icon="🚐" title={`${data.transfersWithoutDriver.count} transfer${data.transfersWithoutDriver.count === 1 ? "" : "s"} with no driver`} href="/dashboard/travel/transport">
        {data.transfersWithoutDriver.rows.slice(0, 4).map((row) => (
          <Row key={row.id} left={`${row.title}${row.party ? ` · ${row.party}` : ""}`} right={row.when} tone={row.urgent ? "#f87171" : undefined} />
        ))}
      </Group>,
    );
  }

  if (data.trips.travellingSoonUnpaid) {
    groups.push(
      <Group key="tu" tone="#f4c25b" icon="🧳" title={`${data.trips.travellingSoonUnpaid} trip${data.trips.travellingSoonUnpaid === 1 ? "" : "s"} flying this week, not invoiced`} href="/dashboard/travel/trips">
        {data.trips.rows.filter((row) => !row.invoiceNo).slice(0, 4).map((row) => (
          <Row key={row.id} left={`${row.bookingNo} · ${row.customerName}`} right={row.travelDate ?? ""} tone="#f4c25b" />
        ))}
      </Group>,
    );
  }

  if (data.trips.unquoted) {
    groups.push(
      <Group key="uq" tone="#60a5fa" icon="📄" title={`${data.trips.unquoted} priced trip${data.trips.unquoted === 1 ? "" : "s"} never quoted`} href="/dashboard/travel/trips">
        <Row left="A customer is waiting on a price they were promised" right="" />
      </Group>,
    );
  }

  if (data.insuranceCoverEnding.count) {
    groups.push(
      <Group key="in" tone="#f4c25b" icon="🛡" title={`${data.insuranceCoverEnding.count} polic${data.insuranceCoverEnding.count === 1 ? "y" : "ies"} ending within a week`} href="/dashboard/travel/insurance">
        {data.insuranceCoverEnding.rows.slice(0, 4).map((row) => (
          <Row key={row.id} left={`${row.title}${row.traveler ? ` · ${row.traveler}` : ""}`} right={row.coverTo} />
        ))}
      </Group>,
    );
  }

  // Nothing wrong. A panel that is always shouting gets scrolled past, so it
  // says so once and quietly.
  if (!groups.length) {
    return (
      <div style={{ border: "1px solid rgba(52,211,153,.3)", background: "rgba(52,211,153,.07)", borderRadius: 13, padding: "12px 15px", fontSize: 12.5, color: "#34d399", marginBottom: 18 }}>
        ✓ Nothing needs attention — no passport under six months, no transfer without a driver, nothing flying this week uninvoiced.
      </div>
    );
  }

  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>Needs attention</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {groups}
      </div>
    </section>
  );
}
