/**
 * Inline TypeScript source fixtures for docstring-audit tests.
 * Kept in a separate file so check-docstrings.test.ts stays ≤200 lines.
 */

export const DOCUMENTED_FUNCTION = `
/** Adds two numbers together. */
export function add(a: number, b: number): number {
  return a + b;
}
`.trimStart();

export const UNDOCUMENTED_FUNCTION = `
export function subtract(a: number, b: number): number {
  return a - b;
}
`.trimStart();

export const OUT_OF_SCOPE_ONLY = `
export type Foo = string;
export interface Bar { x: number; }
export { something } from './other';
export const KIND = 'literal' as const;
`.trimStart();

export const DOCUMENTED_ARROW = `
/** Multiplies two numbers. */
export const multiply = (a: number, b: number): number => {
  const result = a * b;
  return result;
};
`.trimStart();

export const UNDOCUMENTED_ARROW = `
export const divide = (a: number, b: number): number => {
  const result = a / b;
  return result;
};
`.trimStart();

export const DOCUMENTED_CLASS = `
export class Calculator {
  /** Computes the sum of two values. */
  sum(a: number, b: number): number {
    return a + b;
  }
  private secret(): void { /* noop */ }
  protected hidden(): void { /* noop */ }
}
`.trimStart();

export const PURE_BARREL = `
export { add } from './add';
export { subtract } from './subtract';
`.trimStart();

/** One-line passthrough (function declaration) — skipped by audit. */
export const ONE_LINE_PASSTHROUGH_FN = `
declare function inner(x: number): number;
export function wrap(x: number): number { return inner(x); }
`.trimStart();

/** One-line passthrough (arrow with block body) — skipped by audit. */
export const ONE_LINE_PASSTHROUGH_ARROW = `
declare function inner(x: number): number;
export const wrapArrow = (x: number): number => { return inner(x); };
`.trimStart();

/** Two exports in different files — exercises sort by file name (fc !== 0 branch). */
export const SECOND_DOCUMENTED_FUNCTION = `
/** Returns the input incremented by two. */
export function increment(x: number): number {
  return x + 2;
}
`.trimStart();

/** Two exports in the same file — exercises sort by (file, line). */
export const TWO_EXPORTS_SAME_FILE = `
/** First export. */
export function first(x: number): number {
  return x + 1;
}

/** Second export. */
export function second(x: number): number {
  return x + 2;
}
`.trimStart();

/** Anonymous class export — exercises className fallback to '(anonymous)'. */
export const ANONYMOUS_CLASS = `
export default class {
  /** Does something. */
  run(): void { /* noop */ }
}
`.trimStart();

/** FunctionExpression assigned to a const — exercises isArrowFunction || isFunctionExpression branch. */
export const FUNCTION_EXPRESSION = `
/** A function expression. */
export const compute = function(a: number, b: number): number {
  const result = a * b;
  return result;
};
`.trimStart();

/**
 * Class with a property member and computed method name.
 * Exercises: "skip non-method member" (line 94) and "skip non-identifier method name" (line 97).
 */
export const CLASS_WITH_PROPERTY_AND_COMPUTED = `
export class Holder {
  value = 42;
  ['computed'](): void { /* noop */ }
  /** Gets the value. */
  get(): number { return this.value; }
}
`.trimStart();

/** Variable declared but not initialized — exercises "if (!init) continue" (line 132). */
export const UNINITIALIZED_VAR = `
export declare const placeholder: string;
`.trimStart();
