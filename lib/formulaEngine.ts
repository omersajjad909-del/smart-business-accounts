// FILE: lib/formulaEngine.ts
//
// A small, safe expression language for user-written costing formulas.
//
// Why not `eval` / `new Function`: a formula is written by a user and evaluated
// on our server. Handing that string to the JS engine hands the author the
// process — every environment variable and the whole database with it. So this
// is a real tokenizer and parser over a fixed grammar; anything outside the
// grammar is a syntax error rather than code.
//
// The language is deliberately industry-agnostic. Nothing about rolls, bags,
// fabric or sheets lives here. A PVC bag formula and a plywood cutting formula
// are the same shape: named inputs, ordered steps, named outputs. Constants a
// trade cares about — allowed stock widths, a cutting allowance, a density
// divisor — are the author's inputs, not ours.

/* ────────────────────────────── Values ────────────────────────────── */

/** A list is how an author states the stock sizes their supplier actually sells. */
export type FormulaValue = number | number[];

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

const MAX_EXPRESSION_LENGTH = 2000;
const MAX_LIST_LENGTH = 200;
/** Stops a pathological expression from eating the stack. */
const MAX_DEPTH = 40;

/* ───────────────────────────── Tokenizer ──────────────────────────── */

type TokenType = "num" | "ident" | "op" | "(" | ")" | "[" | "]" | ",";
type Token = { type: TokenType; value: string; pos: number };

const OPERATORS = ["<=", ">=", "==", "!=", "&&", "||", "+", "-", "*", "/", "%", "^", "<", ">"];

function tokenize(src: string): Token[] {
  if (src.length > MAX_EXPRESSION_LENGTH) {
    throw new FormulaError("Expression is too long");
  }
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { i++; continue; }

    if (ch >= "0" && ch <= "9") {
      let j = i;
      while (j < src.length && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j++;
      const raw = src.slice(i, j);
      if ((raw.match(/\./g) || []).length > 1) {
        throw new FormulaError(`Bad number "${raw}"`);
      }
      tokens.push({ type: "num", value: raw, pos: i });
      i = j;
      continue;
    }

    // Identifiers: letters, digits and underscore, not starting with a digit.
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ type: "ident", value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }

    if (ch === "(" || ch === ")" || ch === "[" || ch === "]" || ch === ",") {
      tokens.push({ type: ch as TokenType, value: ch, pos: i });
      i++;
      continue;
    }

    const twoChar = src.slice(i, i + 2);
    const op = OPERATORS.find((o) => o.length === 2 && o === twoChar)
      ?? OPERATORS.find((o) => o.length === 1 && o === ch);
    if (op) {
      tokens.push({ type: "op", value: op, pos: i });
      i += op.length;
      continue;
    }

    throw new FormulaError(`Unexpected character "${ch}" at position ${i + 1}`);
  }

  return tokens;
}

/* ─────────────────────────────── Parser ───────────────────────────── */

type Node =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "list"; items: Node[] }
  | { kind: "unary"; op: string; operand: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[] };

/** Higher binds tighter. Mirrors ordinary arithmetic so authors are not surprised. */
const PRECEDENCE: Record<string, number> = {
  "||": 1, "&&": 2,
  "==": 3, "!=": 3, "<": 3, ">": 3, "<=": 3, ">=": 3,
  "+": 4, "-": 4,
  "*": 5, "/": 5, "%": 5,
  "^": 6,
};

function parse(tokens: Token[]): Node {
  let pos = 0;
  let depth = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function expect(type: TokenType, what: string): Token {
    const t = peek();
    if (!t || t.type !== type) throw new FormulaError(`Expected ${what}`);
    return next();
  }

  function parsePrimary(): Node {
    if (++depth > MAX_DEPTH) throw new FormulaError("Expression is nested too deeply");
    try {
      const t = peek();
      if (!t) throw new FormulaError("Expression ended unexpectedly");

      if (t.type === "num") {
        next();
        return { kind: "num", value: Number(t.value) };
      }

      if (t.type === "op" && (t.value === "-" || t.value === "+")) {
        next();
        return { kind: "unary", op: t.value, operand: parsePrimary() };
      }

      if (t.type === "(") {
        next();
        const inner = parseExpression(0);
        expect(")", "a closing bracket )");
        return inner;
      }

      if (t.type === "[") {
        next();
        const items: Node[] = [];
        if (peek()?.type !== "]") {
          for (;;) {
            items.push(parseExpression(0));
            if (items.length > MAX_LIST_LENGTH) throw new FormulaError("List is too long");
            if (peek()?.type === ",") { next(); continue; }
            break;
          }
        }
        expect("]", "a closing bracket ]");
        return { kind: "list", items };
      }

      if (t.type === "ident") {
        next();
        if (peek()?.type === "(") {
          next();
          const args: Node[] = [];
          if (peek()?.type !== ")") {
            for (;;) {
              args.push(parseExpression(0));
              if (peek()?.type === ",") { next(); continue; }
              break;
            }
          }
          expect(")", "a closing bracket )");
          return { kind: "call", name: t.value, args };
        }
        return { kind: "var", name: t.value };
      }

      throw new FormulaError(`Unexpected "${t.value}"`);
    } finally {
      depth--;
    }
  }

  function parseExpression(minPrec: number): Node {
    let left = parsePrimary();
    for (;;) {
      const t = peek();
      if (!t || t.type !== "op") break;
      const prec = PRECEDENCE[t.value];
      if (prec === undefined || prec < minPrec) break;
      next();
      // `^` is right-associative; everything else groups left to right.
      const right = parseExpression(t.value === "^" ? prec : prec + 1);
      left = { kind: "binary", op: t.value, left, right };
    }
    return left;
  }

  const ast = parseExpression(0);
  if (pos < tokens.length) {
    throw new FormulaError(`Unexpected "${tokens[pos].value}" after the end of the expression`);
  }
  return ast;
}

/* ────────────────────────── Function library ──────────────────────── */

function num(v: FormulaValue, fn: string, argIndex: number): number {
  if (typeof v !== "number") {
    throw new FormulaError(`${fn}() expects a number for argument ${argIndex + 1}, got a list`);
  }
  return v;
}

function list(v: FormulaValue, fn: string, argIndex: number): number[] {
  if (!Array.isArray(v)) {
    throw new FormulaError(`${fn}() expects a list for argument ${argIndex + 1}, e.g. [48, 50, 52]`);
  }
  return v;
}

/** Length and weight conversions every trade ends up needing. */
const UNIT_TO_BASE: Record<string, number> = {
  // length → millimetres
  mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8, yd: 914.4,
  // weight → grams
  g: 1, kg: 1000, lb: 453.59237, oz: 28.349523125,
};
const UNIT_KIND: Record<string, "length" | "weight"> = {
  mm: "length", cm: "length", m: "length", in: "length", ft: "length", yd: "length",
  g: "weight", kg: "weight", lb: "weight", oz: "weight",
};

export type FormulaFn = {
  name: string;
  arity: [min: number, max: number];
  signature: string;
  description: string;
  apply: (args: FormulaValue[]) => FormulaValue;
};

export const FUNCTIONS: FormulaFn[] = [
  {
    name: "floor", arity: [1, 1], signature: "floor(x)",
    description: "Round down. Use for whole pieces you can actually get out.",
    apply: (a) => Math.floor(num(a[0], "floor", 0)),
  },
  {
    name: "ceil", arity: [1, 1], signature: "ceil(x)",
    description: "Round up. Use for units you have to buy.",
    apply: (a) => Math.ceil(num(a[0], "ceil", 0)),
  },
  {
    name: "round", arity: [1, 2], signature: "round(x, decimals?)",
    description: "Round to the nearest value, optionally to N decimals.",
    apply: (a) => {
      const x = num(a[0], "round", 0);
      const d = a.length > 1 ? num(a[1], "round", 1) : 0;
      const f = Math.pow(10, Math.max(0, Math.min(10, Math.floor(d))));
      return Math.round(x * f) / f;
    },
  },
  {
    name: "abs", arity: [1, 1], signature: "abs(x)",
    description: "Absolute value.",
    apply: (a) => Math.abs(num(a[0], "abs", 0)),
  },
  {
    name: "sqrt", arity: [1, 1], signature: "sqrt(x)",
    description: "Square root.",
    apply: (a) => {
      const x = num(a[0], "sqrt", 0);
      if (x < 0) throw new FormulaError("sqrt() of a negative number");
      return Math.sqrt(x);
    },
  },
  {
    name: "min", arity: [1, 99], signature: "min(a, b, …)",
    description: "Smallest of the values, or of a list.",
    apply: (a) => {
      const nums = a.flatMap((v) => (Array.isArray(v) ? v : [v]));
      if (!nums.length) throw new FormulaError("min() needs at least one value");
      return Math.min(...nums);
    },
  },
  {
    name: "max", arity: [1, 99], signature: "max(a, b, …)",
    description: "Largest of the values, or of a list.",
    apply: (a) => {
      const nums = a.flatMap((v) => (Array.isArray(v) ? v : [v]));
      if (!nums.length) throw new FormulaError("max() needs at least one value");
      return Math.max(...nums);
    },
  },
  {
    name: "pct", arity: [2, 2], signature: "pct(value, percent)",
    description: "A percentage of a value — wastage, shrinkage, makeready.",
    apply: (a) => (num(a[0], "pct", 0) * num(a[1], "pct", 1)) / 100,
  },
  {
    name: "addPct", arity: [2, 2], signature: "addPct(value, percent)",
    description: "Value plus a percentage. addPct(100, 8) = 108.",
    apply: (a) => num(a[0], "addPct", 0) * (1 + num(a[1], "addPct", 1) / 100),
  },
  {
    name: "fitCount", arity: [2, 2], signature: "fitCount(piece, stock)",
    description: "How many whole pieces fit into one stock unit.",
    apply: (a) => {
      const piece = num(a[0], "fitCount", 0);
      const stock = num(a[1], "fitCount", 1);
      if (piece <= 0) throw new FormulaError("fitCount() needs a piece size greater than zero");
      return Math.floor(stock / piece);
    },
  },
  {
    name: "snapUp", arity: [2, 2], signature: "snapUp(value, [sizes])",
    description: "Smallest stock size that is still big enough. 57.5 with [48…60] gives 58.",
    apply: (a) => {
      const v = num(a[0], "snapUp", 0);
      const sizes = list(a[1], "snapUp", 1).slice().sort((x, y) => x - y);
      const hit = sizes.find((s) => s >= v);
      if (hit === undefined) {
        throw new FormulaError(`No stock size in the list is as large as ${v}`);
      }
      return hit;
    },
  },
  {
    name: "snapDown", arity: [2, 2], signature: "snapDown(value, [sizes])",
    description: "Largest stock size that still fits inside the value.",
    apply: (a) => {
      const v = num(a[0], "snapDown", 0);
      const sizes = list(a[1], "snapDown", 1).slice().sort((x, y) => y - x);
      const hit = sizes.find((s) => s <= v);
      if (hit === undefined) {
        throw new FormulaError(`Every stock size in the list is larger than ${v}`);
      }
      return hit;
    },
  },
  {
    name: "bestFitStock", arity: [2, 2], signature: "bestFitStock(piece, [sizes])",
    description:
      "The stock size that wastes least when the piece is packed across it. " +
      "Ties go to the smaller stock.",
    apply: (a) => bestFit(a, "bestFitStock").stock,
  },
  {
    name: "bestFitCount", arity: [2, 2], signature: "bestFitCount(piece, [sizes])",
    description: "How many pieces fit across the stock size bestFitStock() picks.",
    apply: (a) => bestFit(a, "bestFitCount").count,
  },
  {
    name: "scaleToRange", arity: [3, 3], signature: "scaleToRange(value, min, max)",
    description:
      "Whole multiplier that brings the value into a working range. " +
      "A 24.5 cut with a 30–50 machine range gives 2.",
    apply: (a) => {
      const v = num(a[0], "scaleToRange", 0);
      const lo = num(a[1], "scaleToRange", 1);
      const hi = num(a[2], "scaleToRange", 2);
      if (v <= 0) throw new FormulaError("scaleToRange() needs a value greater than zero");
      if (lo > hi) throw new FormulaError("scaleToRange() minimum is greater than its maximum");
      for (let k = 1; k <= 1000; k++) {
        const scaled = v * k;
        if (scaled >= lo && scaled <= hi) return k;
        if (scaled > hi) break;
      }
      throw new FormulaError(
        `No whole multiple of ${v} lands between ${lo} and ${hi}`,
      );
    },
  },
  {
    name: "convert", arity: [3, 3], signature: "convert(value, from, to)",
    description:
      "Unit conversion. Units are written as bare words: convert(100, m, in). " +
      "Length: mm cm m in ft yd. Weight: g kg lb oz.",
    apply: (a) => {
      throw new FormulaError("convert() is handled by the evaluator");
    },
  },
  {
    name: "if", arity: [3, 3], signature: "if(condition, then, else)",
    description: "Pick between two values. Conditions use > < >= <= == !=",
    apply: (a) => (num(a[0], "if", 0) !== 0 ? a[1] : a[2]),
  },
];

function bestFit(args: FormulaValue[], fn: string): { stock: number; count: number } {
  const piece = num(args[0], fn, 0);
  const sizes = list(args[1], fn, 1);
  if (piece <= 0) throw new FormulaError(`${fn}() needs a piece size greater than zero`);

  let best: { stock: number; count: number; waste: number } | null = null;
  for (const stock of [...sizes].sort((x, y) => x - y)) {
    const count = Math.floor(stock / piece);
    if (count < 1) continue;
    const waste = stock - count * piece;
    if (!best || waste < best.waste - 1e-9) best = { stock, count, waste };
  }
  if (!best) throw new FormulaError(`No stock size in the list fits a piece of ${piece}`);
  return { stock: best.stock, count: best.count };
}

const FUNCTION_MAP = new Map(FUNCTIONS.map((f) => [f.name, f]));

/* ────────────────────────────── Evaluator ─────────────────────────── */

function checkFinite(v: number, what: string): number {
  if (!Number.isFinite(v)) {
    throw new FormulaError(`${what} produced a value that is not a number`);
  }
  return v;
}

function evaluate(node: Node, scope: Map<string, FormulaValue>): FormulaValue {
  switch (node.kind) {
    case "num":
      return node.value;

    case "list":
      return node.items.map((item) => {
        const v = evaluate(item, scope);
        if (typeof v !== "number") throw new FormulaError("Lists can only hold numbers");
        return v;
      });

    case "var": {
      const v = scope.get(node.name);
      if (v === undefined) {
        throw new FormulaError(`"${node.name}" is not one of this formula's inputs or steps`);
      }
      return v;
    }

    case "unary": {
      const v = num(evaluate(node.operand, scope), node.op, 0);
      return node.op === "-" ? -v : v;
    }

    case "binary": {
      const l = evaluate(node.left, scope);
      const r = evaluate(node.right, scope);
      if (typeof l !== "number" || typeof r !== "number") {
        throw new FormulaError(`"${node.op}" works on numbers, not lists`);
      }
      switch (node.op) {
        case "+": return checkFinite(l + r, "Addition");
        case "-": return checkFinite(l - r, "Subtraction");
        case "*": return checkFinite(l * r, "Multiplication");
        case "/":
          if (r === 0) throw new FormulaError("Division by zero");
          return checkFinite(l / r, "Division");
        case "%":
          if (r === 0) throw new FormulaError("Remainder by zero");
          return checkFinite(l % r, "Remainder");
        case "^": return checkFinite(Math.pow(l, r), "Power");
        case "<":  return l < r  ? 1 : 0;
        case ">":  return l > r  ? 1 : 0;
        case "<=": return l <= r ? 1 : 0;
        case ">=": return l >= r ? 1 : 0;
        case "==": return Math.abs(l - r) < 1e-9 ? 1 : 0;
        case "!=": return Math.abs(l - r) < 1e-9 ? 0 : 1;
        case "&&": return l !== 0 && r !== 0 ? 1 : 0;
        case "||": return l !== 0 || r !== 0 ? 1 : 0;
        default: throw new FormulaError(`Unknown operator "${node.op}"`);
      }
    }

    case "call": {
      const fn = FUNCTION_MAP.get(node.name);
      if (!fn) {
        throw new FormulaError(`There is no function called "${node.name}"`);
      }
      const [minArgs, maxArgs] = fn.arity;
      if (node.args.length < minArgs || node.args.length > maxArgs) {
        throw new FormulaError(`${fn.signature} — wrong number of arguments`);
      }

      // convert() takes bare unit words rather than values, so its arguments are
      // read from the syntax tree instead of being evaluated first.
      if (fn.name === "convert") {
        const value = num(evaluate(node.args[0], scope), "convert", 0);
        const from = node.args[1].kind === "var" ? node.args[1].name : "";
        const to = node.args[2].kind === "var" ? node.args[2].name : "";
        if (!UNIT_TO_BASE[from] || !UNIT_TO_BASE[to]) {
          throw new FormulaError(
            `convert() units must be one of: ${Object.keys(UNIT_TO_BASE).join(", ")}`,
          );
        }
        if (UNIT_KIND[from] !== UNIT_KIND[to]) {
          throw new FormulaError(`Cannot convert ${from} to ${to} — different kinds of unit`);
        }
        return (value * UNIT_TO_BASE[from]) / UNIT_TO_BASE[to];
      }

      const args = node.args.map((a) => evaluate(a, scope));
      const out = fn.apply(args);
      if (typeof out === "number") checkFinite(out, `${fn.name}()`);
      return out;
    }
  }
}

/* ─────────────────────────── Public surface ───────────────────────── */

export type FormulaInput = {
  key: string;
  label: string;
  /** Free text — "in", "kg", "pcs". Display only; convert() does real maths. */
  unit?: string;
  defaultValue?: number;
  /** A list input, e.g. the stock widths a supplier actually sells. */
  isList?: boolean;
  listValue?: number[];
  /** false = fixed in the formula, not asked on every run. */
  askOnRun?: boolean;
};

export type FormulaStep = {
  key: string;
  label: string;
  expression: string;
  unit?: string;
};

/**
 * Which computed value means what to the rest of the app. Without these a
 * formula is only a calculator; with them the result can be pushed onto an item
 * rate or a BOM line.
 */
export type OutputRole =
  | "none"
  | "cost_per_unit"
  | "cost_per_batch"
  | "units_per_batch"
  | "material_qty"
  | "waste_qty";

export type FormulaOutput = {
  /** Key of an input or step to surface. */
  key: string;
  label: string;
  unit?: string;
  role?: OutputRole;
  primary?: boolean;
};

export type CostingFormula = {
  name: string;
  category: string;
  description?: string;
  inputs: FormulaInput[];
  steps: FormulaStep[];
  outputs: FormulaOutput[];
  version: number;
};

export type StepResult = {
  key: string;
  label: string;
  expression: string;
  unit?: string;
  value: FormulaValue | null;
  error?: string;
};

export type FormulaRun = {
  ok: boolean;
  /** Every input and step, in order, with what it evaluated to. */
  steps: StepResult[];
  /** Resolved values by key, for outputs and for callers to read roles from. */
  values: Record<string, FormulaValue>;
  error?: string;
};

const RESERVED = new Set([...FUNCTION_MAP.keys(), ...Object.keys(UNIT_TO_BASE)]);

/** Keys must be usable as identifiers and must not shadow a function or unit. */
export function validateKey(key: string): string | null {
  if (!key) return "Key is required";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return "Use letters, numbers and underscore only, starting with a letter";
  }
  if (RESERVED.has(key)) return `"${key}" is a built-in name — pick another`;
  return null;
}

/** Parses without evaluating — used by the editor to flag syntax as you type. */
export function checkExpression(expression: string): string | null {
  try {
    parse(tokenize(expression));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid expression";
  }
}

/**
 * Runs a formula top to bottom.
 *
 * Steps see the inputs and every step above them, so an author builds the
 * calculation in the order they would do it by hand. A step that fails does not
 * stop the run — it is reported in place and the steps below it simply cannot
 * resolve, which is far easier to debug than one opaque error.
 */
export function runFormula(
  formula: Pick<CostingFormula, "inputs" | "steps">,
  provided: Record<string, number | number[]> = {},
): FormulaRun {
  const scope = new Map<string, FormulaValue>();
  const steps: StepResult[] = [];

  for (const input of formula.inputs) {
    const given = provided[input.key];
    let value: FormulaValue;
    if (input.isList) {
      value = Array.isArray(given) ? given : (input.listValue ?? []);
    } else {
      const n = Array.isArray(given) ? NaN : Number(given ?? input.defaultValue ?? 0);
      value = Number.isFinite(n) ? n : 0;
    }
    scope.set(input.key, value);
    steps.push({
      key: input.key,
      label: input.label || input.key,
      expression: "input",
      unit: input.unit,
      value,
    });
  }

  let firstError: string | undefined;

  for (const step of formula.steps) {
    try {
      const value = evaluate(parse(tokenize(step.expression)), scope);
      scope.set(step.key, value);
      steps.push({
        key: step.key,
        label: step.label || step.key,
        expression: step.expression,
        unit: step.unit,
        value,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not calculate";
      if (!firstError) firstError = `${step.label || step.key}: ${message}`;
      steps.push({
        key: step.key,
        label: step.label || step.key,
        expression: step.expression,
        unit: step.unit,
        value: null,
        error: message,
      });
    }
  }

  const values: Record<string, FormulaValue> = {};
  for (const [k, v] of scope) values[k] = v;

  return { ok: !firstError, steps, values, error: firstError };
}
