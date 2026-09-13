// FILE: lib/docNumber.ts
//
// Document numbers — challans, receipts, vouchers, notes.
//
// Every one of these used to be built the same way:
//
//     const count = await prisma.deliveryChallan.count({ where: { companyId } });
//     const challanNo = `DC-${String(count + 1).padStart(4, "0")}`;
//
// which is wrong twice. A count is not a sequence: delete document 50 of 100
// and the next one asks for DC-0100, which already exists. And two people
// saving at the same moment read the same count and ask for the same number.
// Where the column was unique that surfaced as a save failure; where it was
// not, two documents quietly ended up carrying the same number, which is the
// worse of the two outcomes because nothing reports it.
//
// So numbers come off the highest one actually issued, not off how many rows
// happen to be there, and a clash is retried rather than thrown at whoever was
// unlucky enough to press Save second.

/** Prisma's unique-constraint violation. */
const UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === UNIQUE_VIOLATION;
}

/**
 * The trailing integer of a document number: "DC-0007" → 7, "JV-12" → 12.
 *
 * Reads from the end rather than splitting on the separator, so a prefix that
 * contains one of its own ("VAN-SALE-31") still lands on 31.
 */
export function docNoSeq(value: string | null | undefined): number {
  if (!value) return 0;
  const tail = /(\d+)\s*$/.exec(value);
  return tail ? Number(tail[1]) : 0;
}

export function formatDocNo(prefix: string, seq: number, pad = 4): string {
  return `${prefix}${String(seq).padStart(pad, "0")}`;
}

/**
 * The highest number already issued in this scope.
 *
 * Takes the whole column rather than `orderBy: desc, take: 1` on purpose:
 * ordering is lexical, so an unpadded history sorts "JV-9" above "JV-10" and
 * hands back a number that is already taken. One short string column for one
 * company is cheap; being wrong here costs a failed save every time.
 */
export function highestSeq(rows: { [k: string]: unknown }[], field: string): number {
  let top = 0;
  for (const row of rows) {
    const seq = docNoSeq(row[field] as string | null | undefined);
    if (seq > top) top = seq;
  }
  return top;
}

/**
 * The next number to issue: one past the highest already in `rows`.
 *
 * The two-liner most callers want —
 *
 *     const issued = await prisma.creditNote.findMany({
 *       where: { companyId }, select: { creditNoteNumber: true },
 *     });
 *     const creditNoteNumber = nextDocNo(issued, "creditNoteNumber", "CN-");
 */
export function nextDocNo(
  rows: { [k: string]: unknown }[],
  field: string,
  prefix: string,
  pad = 4,
): string {
  return formatDocNo(prefix, highestSeq(rows, field) + 1, pad);
}

/**
 * Creates a document with the next free number, retrying if someone else took
 * it first.
 *
 * `nextNo` is called with 0, then 1, then 2… so a caller can step past a
 * number that has just been taken without re-querying from scratch.
 */
export async function withDocNo<T>(
  nextNo: (offset: number) => Promise<string>,
  create: (docNo: string) => Promise<T>,
  tries = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    const docNo = await nextNo(attempt);
    try {
      return await create(docNo);
    } catch (e) {
      // Only a number clash is worth another go. Anything else — a missing
      // customer, a bad date — will fail the same way five times over and the
      // caller should see it now, not in five attempts' time.
      if (!isUniqueViolation(e)) throw e;
      lastError = e;
    }
  }
  throw lastError;
}
