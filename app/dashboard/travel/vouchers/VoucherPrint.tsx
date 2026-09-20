"use client";

/**
 * The printed arrival-departure voucher.
 *
 * Laid out to match the document Pakistani Umrah operators already hand out,
 * down to the colour of the bands and the order of the boxes. That is not
 * decoration: the Saudi hotel desk, the transport office and the pilgrim's own
 * family all read this form by shape, and a tidier layout they have never seen
 * is a worse document however much better it looks.
 *
 * Deliberately light-on-white with its own print CSS. The dashboard is dark; a
 * voucher is carried, photocopied and faxed.
 */

import {
  fmtVoucherDate,
  nightsBetween,
  roomTypeLabel,
  type UmrahVoucher,
  type VoucherFlight,
  type VoucherHotelStay,
} from "@/lib/umrahVoucher";

const INK = "#111";
const LINE = "#7a1f1f";
const BAND = "#1d4e89";
const BAND_HOTEL = "#2e7d32";
const HEAD_BG = "#f3f4f6";

const cellLabel: React.CSSProperties = {
  background: HEAD_BG, border: "1px solid #999", padding: "3px 6px",
  fontSize: 9, fontWeight: 700, color: INK, whiteSpace: "nowrap",
};
const cellValue: React.CSSProperties = {
  border: "1px solid #999", padding: "3px 6px", fontSize: 9.5, color: INK,
};

function FlightTable({ flight, heading, bandColour }: { flight: VoucherFlight; heading: string; bandColour: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ background: bandColour, color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "3px 7px" }}>
        {heading}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={cellLabel}>Flight No</td>
            <td style={cellLabel}>Flight Date</td>
            <td style={cellLabel}>Sector</td>
            <td style={cellLabel}>Terminal</td>
          </tr>
          <tr>
            <td style={cellValue}>{flight.flightNo || "—"}</td>
            <td style={cellValue}>
              {fmtVoucherDate(flight.date) || "—"}
              {flight.time ? ` | ${flight.time}` : ""}
            </td>
            <td style={cellValue}>{flight.sector || "—"}</td>
            <td style={cellValue}>{flight.terminal || "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StayTable({ stay }: { stay: VoucherHotelStay }) {
  const nights = nightsBetween(stay.inDate, stay.outDate);
  const row = (label: string, value: React.ReactNode) => (
    <tr>
      <td style={{ ...cellLabel, width: "46%" }}>{label}</td>
      <td style={{ ...cellValue, textAlign: "center" }}>{value}</td>
    </tr>
  );
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ background: BAND_HOTEL, color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "3px 7px" }}>
        Hotel In {stay.city}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {row("Hotel Name", stay.hotelName || "—")}
          {row("Room Type", roomTypeLabel(stay.occupancy))}
          {row("In Date", fmtVoucherDate(stay.inDate) || "—")}
          {/* The number the hotel desk checks. Worked out from the dates above
              it, so the two can never be handed over disagreeing. */}
          {row("Nights", nights || "—")}
          {row("Out Date", fmtVoucherDate(stay.outDate) || "—")}
          {row("No Of Room", stay.rooms || 1)}
          {row(
            "Room No",
            <span style={{ color: LINE, fontWeight: 700 }}>{stay.roomNo?.trim() || "SELF HOTEL--"}</span>,
          )}
        </tbody>
      </table>
    </div>
  );
}

export function VoucherPrint({ voucher, companyName }: { voucher: UmrahVoucher; companyName?: string }) {
  const similar = voucher.stays.filter((s) => s.orSimilar && s.hotelName.trim());

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          /* Everything that is not the voucher, at any depth. Keep an element
             if it CONTAINS the voucher, if it IS the voucher, or if it is
             inside it — the same three exclusions the other documents use. */
          body:has(.umrah-voucher) *:not(:has(.umrah-voucher)):not(.umrah-voucher):not(.umrah-voucher *) {
            display: none !important;
          }
          body:has(.umrah-voucher) :has(.umrah-voucher) {
            display: block !important;
            margin: 0 !important; padding: 0 !important;
            max-width: none !important; width: auto !important;
            min-height: auto !important; overflow: visible !important;
            background: #fff !important;
          }
          body:has(.umrah-voucher) { background: #fff !important; }
          .umrah-voucher { box-shadow: none !important; margin: 0 !important; }
          /* The QR is scanned off the paper by the Saudi office. Without this a
             browser that has turned background graphics off prints a pale
             square that will not read. */
          .umrah-voucher, .umrah-voucher * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        className="umrah-voucher"
        style={{
          background: "#fff", color: INK, width: 780, maxWidth: "100%",
          margin: "0 auto", padding: 14, fontFamily: "Arial, Helvetica, sans-serif",
          border: "1px solid #999", boxShadow: "0 4px 24px rgba(0,0,0,.18)",
        }}
      >
        {/* Letterhead */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <div style={{ width: 74, height: 56, border: "1px solid #bbb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#999", textAlign: "center" }}>
            Company<br />Logo
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ color: LINE, fontSize: 21, fontWeight: 700, letterSpacing: .5 }}>
              {voucher.agentName || companyName || "TRAVEL"}
            </div>
          </div>
        </div>

        {/* Trip header */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={cellLabel}>Agent Name</td>
              <td style={{ ...cellValue, color: LINE, fontWeight: 700 }}>{voucher.agentName || "—"}</td>
              <td style={cellLabel}>Sub Agent</td>
              <td style={cellValue}>{voucher.subAgent || "—"}</td>
              <td style={cellLabel}>Main Agent</td>
              <td style={cellValue}>{voucher.mainAgent || "—"}</td>
              <td style={cellLabel}>Trip Number</td>
              <td style={{ ...cellValue, color: LINE, fontWeight: 800, fontSize: 12 }}>{voucher.tripNumber || "—"}</td>
              <td style={cellLabel}>Entry Dt</td>
              <td style={cellValue}>
                {fmtVoucherDate(voucher.entryDate) || "—"}
                {voucher.enteredBy ? <div style={{ fontSize: 7.5, color: "#666" }}>{voucher.enteredBy}</div> : null}
              </td>
            </tr>
            <tr>
              <td style={cellLabel}>Guest Name</td>
              <td style={cellValue}>{voucher.guestName || "—"}</td>
              <td style={cellLabel}>C/O</td>
              <td style={cellValue}>{voucher.careOf || "—"}</td>
              <td style={cellLabel}>Reference</td>
              <td style={cellValue}>{voucher.reference || "—"}</td>
              <td style={cellLabel}>No Of Pax</td>
              <td style={{ ...cellValue, textAlign: "center" }}>{voucher.pilgrims.length || "—"}</td>
              <td style={cellLabel}>Update On</td>
              <td style={cellValue}>--</td>
            </tr>
          </tbody>
        </table>

        {/* Flights */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: BAND, color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "3px 7px" }}>
              Arrival Information{voucher.pnr ? `   PNR : ${voucher.pnr}` : ""}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={cellLabel}>Flight No</td>
                  <td style={cellLabel}>Flight Date</td>
                  <td style={cellLabel}>Sector</td>
                  <td style={cellLabel}>Terminal</td>
                </tr>
                <tr>
                  <td style={cellValue}>{voucher.arrival.flightNo || "—"}</td>
                  <td style={cellValue}>
                    {fmtVoucherDate(voucher.arrival.date) || "—"}
                    {voucher.arrival.time ? ` | ${voucher.arrival.time}` : ""}
                  </td>
                  <td style={cellValue}>{voucher.arrival.sector || "—"}</td>
                  <td style={cellValue}>{voucher.arrival.terminal || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <FlightTable flight={voucher.departure} heading="Departure Information" bandColour={BAND} />
        </div>

        {/* Hotels, in trip order. Three across matches the paper form; more
            wrap rather than shrinking off the edge. */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {voucher.stays.map((stay) => (
            <div key={stay.id} style={{ flex: "1 1 30%", minWidth: 210 }}>
              <StayTable stay={stay} />
            </div>
          ))}
        </div>

        {voucher.remarks ? (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ ...cellLabel, background: BAND, color: "#fff", width: 90 }}>Remarks</td>
                <td style={cellValue}>{voucher.remarks}</td>
              </tr>
            </tbody>
          </table>
        ) : null}

        {similar.length > 0 && (
          <div style={{ marginBottom: 8, fontSize: 9 }}>
            <div style={{ fontWeight: 700 }}>{similar.map((s) => s.hotelName).join(", ")} Hotels</div>
            <span style={{ border: "1px solid #999", padding: "1px 5px", fontSize: 8 }}>Or SIMILAR HOTEL</span>
          </div>
        )}

        {/* Pilgrims */}
        <div style={{ background: "#fde68a", padding: "3px 7px", fontSize: 10, fontWeight: 700 }}>
          Hajjies Information
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
          <thead>
            <tr>
              <td style={{ ...cellLabel, width: 26 }}>Sl</td>
              <td style={cellLabel}>Group Name</td>
              <td style={cellLabel}>Hajji Name</td>
              <td style={cellLabel}>Passport No</td>
              <td style={cellLabel}>Gender</td>
              <td style={cellLabel}>Age</td>
            </tr>
          </thead>
          <tbody>
            {voucher.pilgrims.map((p, i) => (
              <tr key={p.id}>
                <td style={{ ...cellValue, textAlign: "center" }}>{i + 1}</td>
                <td style={cellValue}>{p.groupName || "—"}</td>
                <td style={cellValue}>{p.name || "—"}</td>
                <td style={cellValue}>{p.passportNo || "—"}</td>
                <td style={{ ...cellValue, textAlign: "center" }}>{p.gender}</td>
                <td style={{ ...cellValue, textAlign: "center" }}>{p.age === "" ? "—" : p.age}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {voucher.notice ? (
          <div style={{ background: "#c62828", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "3px 7px", marginBottom: 6 }}>
            Note : {voucher.notice}
          </div>
        ) : null}

        {/* The agency's own terms, at the foot where a voucher's terms belong.

            Printed from what the voucher itself stores rather than from the
            current settings: a voucher already in a pilgrim's hand must go on
            saying what it said the day it was issued. */}
        {voucher.terms ? (
          <div
            style={{
              border: "1px solid #999", borderRadius: 2, padding: "5px 7px",
              marginBottom: 6, fontSize: 7.5, color: "#333", lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 8, marginBottom: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>
              Terms &amp; Conditions
            </div>
            {voucher.terms}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", fontSize: 8, color: "#333", lineHeight: 1.5 }}>
          <div style={{ flex: 1 }}>
            {voucher.makkahStaff ? <div>Makkah staff &nbsp; {voucher.makkahStaff}</div> : null}
            {voucher.madinahStaff ? <div style={{ marginTop: 6 }}>Madina staff &nbsp; {voucher.madinahStaff}</div> : null}
          </div>
          {voucher.qrUrl ? (
            <img
              alt="Trip QR"
              width={92}
              height={92}
              /* Rendered by a public chart service so the voucher carries a
                 scannable code without this app taking on a QR dependency. */
              src={`https://api.qrserver.com/v1/create-qr-code/?size=184x184&data=${encodeURIComponent(voucher.qrUrl)}`}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
