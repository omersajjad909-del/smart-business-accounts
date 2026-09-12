/**
 * Makes a document's party readable on the way out of an API route.
 *
 * An Account's phone, NTN, STRN and IBAN are encrypted at rest, and unlike
 * User / Contact / Company they are *not* handled by the client extension in
 * lib/prisma.ts — app/api/accounts encrypts them by hand on write and calls
 * safeDecryptFields on read. That works for the accounts endpoint and for
 * nothing else: every document route that pulls its party in through
 * `include: { customer: true }` or `{ supplier: true }` gets the row exactly as
 * stored.
 *
 * That is not theoretical. The sales invoice list shipped without a decrypt and
 * saved invoices printed "enc:v1:…" where the buyer's NTN and STRN belong — on
 * the copy that goes to the customer. The same include exists in the challan,
 * purchase invoice, quotation, purchase order and sale return routes, so the
 * same ciphertext was already crossing the wire there; it simply had not been
 * printed yet.
 *
 * One call at the response boundary covers a single document, a list of them,
 * or a wrapper like `{ quotation }` — the shapes these routes actually return.
 */

import { safeDecryptFields, ACCOUNT_PII_FIELDS } from "@/lib/fieldEncrypt";

/** Relation names that hold an Account. Matched by key, never guessed by shape. */
const PARTY_KEYS = new Set(["customer", "supplier", "party", "account"]);

/** Deep enough for `{ data: [ { customer } ] }`; short enough to stay cheap. */
const MAX_DEPTH = 4;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object") return false;
  if (Array.isArray(v) || v instanceof Date) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function walk(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return value;

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((entry) => {
      const w = walk(entry, depth + 1);
      if (w !== entry) changed = true;
      return w;
    });
    return changed ? next : value;
  }

  if (!isPlainObject(value)) return value;

  let changed = false;
  const out: Record<string, unknown> = { ...value };
  for (const [key, child] of Object.entries(value)) {
    if (PARTY_KEYS.has(key) && isPlainObject(child)) {
      out[key] = safeDecryptFields(child, ACCOUNT_PII_FIELDS);
      changed = true;
      continue;
    }
    const w = walk(child, depth + 1);
    if (w !== child) {
      out[key] = w;
      changed = true;
    }
  }
  return changed ? out : value;
}

/**
 * The same value with every nested `customer` / `supplier` decrypted.
 *
 * Returns the original object untouched when there was nothing to decrypt, so
 * wrapping a response that carries no party costs one shallow walk and no copy.
 */
export function withReadableParties<T>(value: T): T {
  return walk(value, 0) as T;
}
