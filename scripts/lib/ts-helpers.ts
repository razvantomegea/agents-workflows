/**
 * TypeScript compiler API helpers for the docstring audit.
 * Detects JSDoc presence, export modifiers, barrel files, and one-line passthroughs.
 */
import * as ts from 'typescript';

// ── modifier / export helpers ─────────────────────────────────────────────────

export function hasModifierFlag(node: ts.Node, flag: ts.ModifierFlags): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & flag) !== 0;
}

export function isExported(node: ts.Node): boolean {
  return hasModifierFlag(node, ts.ModifierFlags.Export);
}

export function isReExport(node: ts.Node): node is ts.ExportDeclaration {
  return ts.isExportDeclaration(node) && node.moduleSpecifier != null;
}

export function isPureBarrel(sourceFile: ts.SourceFile): boolean {
  return sourceFile.statements.every(
    (stmt) => ts.isExportDeclaration(stmt) || ts.isImportDeclaration(stmt),
  );
}

// ── docstring detection ───────────────────────────────────────────────────────

/** Returns true if the node has an attached JSDoc block comment (`/** ... *\/`). */
export function detectDocstring(node: ts.Node, sourceText: string): boolean {
  if (ts.getJSDocCommentsAndTags(node).length > 0) return true;
  const ranges = ts.getLeadingCommentRanges(sourceText, node.getFullStart());
  if (ranges) {
    return ranges.some((r) => {
      const text = sourceText.slice(r.pos, r.end);
      return text.startsWith('/**') && !text.startsWith('/***');
    });
  }
  return false;
}

// ── passthrough detection ─────────────────────────────────────────────────────

/**
 * Returns true for one-line passthroughs: a function body with a single
 * `return someCall(arg1, arg2)` where every argument is the matching parameter
 * identifier (1:1 in order, no transforms, no rest/destructure).
 */
export function isOneLinePassthrough(
  fn: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
): boolean {
  const body = fn.body;
  if (!body || !ts.isBlock(body)) return false;
  const stmts = body.statements;
  if (stmts.length !== 1) return false;
  const stmt = stmts[0];
  if (!ts.isReturnStatement(stmt) || !stmt.expression) return false;
  const expr = stmt.expression;
  if (!ts.isCallExpression(expr)) return false;
  const params = fn.parameters;
  const args = expr.arguments;
  if (params.length !== args.length) return false;
  return args.every((arg, i) => {
    if (!ts.isIdentifier(arg)) return false;
    const param = params[i];
    if (!ts.isIdentifier(param.name)) return false;
    return (param.name as ts.Identifier).text === arg.text;
  });
}

// ── position helpers ──────────────────────────────────────────────────────────

export function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

export function nodeLineCount(sourceFile: ts.SourceFile, node: ts.Node): number {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line;
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
  return end - start + 1;
}
