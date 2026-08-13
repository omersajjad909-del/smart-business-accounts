// FILE: lib/passwordPolicy.ts
//
// One password policy for every path that sets a password (signup, reset,
// change). Previously each route did its own `length < 8` check, so a reset
// link could set a password weaker than the signup form would accept.

/** Passwords that show up at the top of every breach corpus. */
const BLOCKLIST = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789",
  "1234567890", "qwerty123", "qwertyuiop", "letmein1", "iloveyou", "admin123",
  "welcome1", "welcome123", "abc12345", "111111111", "finova123", "finovaos",
  "changeme", "secret123", "monkey123", "football1", "sunshine1", "trustno1",
]);

export type PasswordCheck = { ok: true } | { ok: false; error: string };

export const MIN_PASSWORD_LENGTH = 10;
/** How many of the four character classes a password must use. */
export const REQUIRED_CLASS_COUNT = 3;

const CLASS_TESTS = [
  { id: "lower",  label: "One lowercase letter", test: /[a-z]/ },
  { id: "upper",  label: "One uppercase letter", test: /[A-Z]/ },
  { id: "number", label: "One number",           test: /[0-9]/ },
  { id: "symbol", label: "One special character", test: /[^A-Za-z0-9]/ },
] as const;

export type PasswordRule = {
  id: string;
  label: string;
  met: boolean;
  /** One of the "any 3 of 4" character classes rather than a hard requirement. */
  optional?: boolean;
};

/**
 * The same policy as `validatePassword`, broken out rule by rule so a form can
 * show what is still missing while the user types.
 *
 * It lives beside the validator on purpose: a checklist that promises different
 * rules from the ones the server enforces is worse than no checklist, because
 * it tells the user they are done when the request is about to be rejected.
 */
export function passwordRules(
  password: string,
  context: (string | null | undefined)[] = [],
): { rules: PasswordRule[]; classesMet: number; ok: boolean } {
  const pw = String(password || "");
  const lower = pw.toLowerCase();

  const classRules: PasswordRule[] = CLASS_TESTS.map((c) => ({
    id: c.id,
    label: c.label,
    met: c.test.test(pw),
    optional: true,
  }));
  const classesMet = classRules.filter((r) => r.met).length;

  const echoesContext = context.some((raw) => {
    const value = String(raw || "").toLowerCase().trim();
    if (!value) return false;
    const local = value.split("@")[0];
    return local.length >= 4 && lower.includes(local);
  });

  const predictable =
    BLOCKLIST.has(lower) ||
    /^(.)\1+$/.test(pw) ||
    /(0123456789|abcdefghij|qwertyuiop)/.test(lower);

  const rules: PasswordRule[] = [
    {
      id: "length",
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: pw.length >= MIN_PASSWORD_LENGTH && pw.length <= 200,
    },
    ...classRules,
    {
      id: "notCommon",
      // Only claimed once there is something to judge, so an empty field does
      // not show a green tick for a password that does not exist yet.
      label: "Not a common password, your name or email",
      met: pw.length > 0 && !predictable && !echoesContext,
    },
  ];

  return {
    rules,
    classesMet,
    ok: validatePassword(pw, context).ok,
  };
}

/**
 * @param password  the candidate password
 * @param context   values the password must not simply echo (email, name)
 */
export function validatePassword(
  password: string,
  context: (string | null | undefined)[] = [],
): PasswordCheck {
  const pw = String(password || "");

  if (pw.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters" };
  }
  if (pw.length > 200) {
    return { ok: false, error: "Password must be 200 characters or fewer" };
  }

  const classes =
    Number(/[a-z]/.test(pw)) +
    Number(/[A-Z]/.test(pw)) +
    Number(/[0-9]/.test(pw)) +
    Number(/[^A-Za-z0-9]/.test(pw));
  if (classes < 3) {
    return {
      ok: false,
      error:
        "Password must include at least three of: lowercase, uppercase, number, symbol",
    };
  }

  const lower = pw.toLowerCase();
  if (BLOCKLIST.has(lower)) {
    return { ok: false, error: "This password is too common. Choose another." };
  }

  // A single repeated character, or a straight run off the keyboard/number row.
  if (/^(.)\1+$/.test(pw)) {
    return { ok: false, error: "Password cannot be a single repeated character" };
  }
  if (/(0123456789|abcdefghij|qwertyuiop)/.test(lower)) {
    return { ok: false, error: "This password is too predictable. Choose another." };
  }

  for (const raw of context) {
    const value = String(raw || "").toLowerCase().trim();
    if (!value) continue;
    // Compare against the local part of an email too — "umersajjad981@gmail.com"
    // should rule out "umersajjad981" as a password.
    const local = value.split("@")[0];
    if (local.length >= 4 && lower.includes(local)) {
      return {
        ok: false,
        error: "Password must not contain your name or email address",
      };
    }
  }

  return { ok: true };
}
