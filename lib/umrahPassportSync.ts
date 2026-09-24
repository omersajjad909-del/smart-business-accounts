import type { BusinessRecord } from "@/lib/useBusinessRecords";
import type { BookingPilgrim } from "@/lib/umrahBooking";

type PassportPayload = {
  title: string;
  data: Record<string, unknown>;
  status?: string;
  date?: string;
};
type PassportUpdatePayload = Pick<PassportPayload, "title" | "data" | "date">;

/**
 * Keep the legacy Passenger Passport Database in step with Hajj/Umrah pilgrims.
 * Booking/group-ops remains where staff enter the details; this only mirrors
 * passport-bearing pilgrims so nobody has to re-enter the same passport.
 */
export async function syncUmrahPilgrimPassports(
  pilgrims: BookingPilgrim[],
  records: BusinessRecord[],
  create: (payload: PassportPayload) => Promise<BusinessRecord>,
  update: (id: string, payload: PassportUpdatePayload) => Promise<BusinessRecord>,
) {
  const working = [...records];
  for (const pilgrim of pilgrims) {
    const name = String(pilgrim.name || "").trim();
    const passportNo = String(pilgrim.passportNo || "").trim().toUpperCase();
    if (!name || !passportNo) continue;

    const match = working.find((record) => {
      const data = record.data as Record<string, unknown>;
      const savedNo = String(data.passportNo || "").trim().toUpperCase();
      const savedName = String(data.passengerName || record.title || "").trim().toUpperCase();
      return savedNo === passportNo || (!savedNo && savedName === name.toUpperCase());
    });
    const existingData = (match?.data || {}) as Record<string, unknown>;
    const expiryDate = String(pilgrim.passportExpiry || existingData.expiryDate || match?.date || "").slice(0, 10);
    const payload: PassportPayload = {
      title: name,
      status: "active",
      ...(expiryDate ? { date: expiryDate } : {}),
      data: {
        ...existingData,
        passengerName: name,
        passportNo,
        nationality: String(existingData.nationality || ""),
        dob: pilgrim.dob || existingData.dob || null,
        issueDate: existingData.issueDate || "",
        expiryDate,
        phone: String(existingData.phone || ""),
        notes: String(existingData.notes || ""),
      },
    };
    if (match) {
      const { title, data, date } = payload;
      const saved = await update(match.id, { title, data, ...(date ? { date } : {}) });
      working[working.findIndex((record) => record.id === match.id)] = saved;
    } else {
      working.unshift(await create(payload));
    }
  }
}
