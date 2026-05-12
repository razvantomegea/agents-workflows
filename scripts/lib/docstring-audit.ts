/**
 * Shared audit core for docstring coverage analysis.
 * Walks rootDir/**\/*.ts, parses each file via the TypeScript compiler API,
 * and returns one AuditEntry per exported function / arrow / class method.
 *
 * Out-of-scope rules (PRD §Epic 15):
 *   - export type / export interface / export const enum
 *   - barrel re-exports (export { … } from, export * from)
 *   - pure barrel files (every top-level statement is a re-export)
 *   - one-line passthroughs
 *   - dist/, coverage/, .ejs files
 *   - tests/** source files (excluded by passing rootDir = 'src')
 */
import * as ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { collectSrcFiles } from './walk-src.js';
import {
  isExported,
  isReExport,
  isPureBarrel,
  detectDocstring,
  isOneLinePassthrough,
  hasModifierFlag,
  lineOf,
  nodeLineCount,
} from './ts-helpers.js';

export type AuditEntry = {
  file: string;
  exportName: string;
  kind: 'function' | 'arrow' | 'method';
  hasDocstring: boolean;
  lineCount: number;
  line: number;
};

export type AuditOptions = {
  rootDir: string;
};

// Re-export for consumers that need the allowlist constant.
export { OUT_OF_SCOPE_GLOBS } from './walk-src.js';

// ── entry builders ────────────────────────────────────────────────────────────

function entryFromFunction(
  relPath: string,
  sourceFile: ts.SourceFile,
  node: ts.FunctionDeclaration,
): AuditEntry | null {
  const name = node.name?.text;
  if (!name) return null;
  if (isOneLinePassthrough(node)) return null;
  return {
    file: relPath,
    exportName: name,
    kind: 'function',
    hasDocstring: detectDocstring(node, sourceFile.text),
    line: lineOf(sourceFile, node),
    lineCount: nodeLineCount(sourceFile, node),
  };
}

function entryFromArrow(
  relPath: string,
  sourceFile: ts.SourceFile,
  stmt: ts.VariableStatement,
  decl: ts.VariableDeclaration,
  init: ts.ArrowFunction | ts.FunctionExpression,
): AuditEntry | null {
  if (!ts.isIdentifier(decl.name)) return null;
  const name = decl.name.text;
  if (isOneLinePassthrough(init)) return null;
  // For arrows, JSDoc attaches to the VariableStatement (the exported outer node).
  return {
    file: relPath,
    exportName: name,
    kind: 'arrow',
    hasDocstring: detectDocstring(stmt, sourceFile.text),
    line: lineOf(sourceFile, stmt),
    lineCount: nodeLineCount(sourceFile, stmt),
  };
}

function entriesFromClass(
  relPath: string,
  sourceFile: ts.SourceFile,
  node: ts.ClassDeclaration,
): AuditEntry[] {
  const className = node.name?.text ?? '(anonymous)';
  const entries: AuditEntry[] = [];
  for (const member of node.members) {
    if (!ts.isMethodDeclaration(member)) continue;
    if (hasModifierFlag(member, ts.ModifierFlags.Private)) continue;
    if (hasModifierFlag(member, ts.ModifierFlags.Protected)) continue;
    if (!ts.isIdentifier(member.name)) continue;
    entries.push({
      file: relPath,
      exportName: `${className}.${member.name.text}`,
      kind: 'method',
      hasDocstring: detectDocstring(member, sourceFile.text),
      line: lineOf(sourceFile, member),
      lineCount: nodeLineCount(sourceFile, member),
    });
  }
  return entries;
}

// ── file-level parser ─────────────────────────────────────────────────────────

function parseFileEntries(absFilePath: string, cwd: string): AuditEntry[] {
  const relPath = path.relative(cwd, absFilePath).split(path.sep).join('/');
  const sourceText = fs.readFileSync(absFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(relPath, sourceText, ts.ScriptTarget.Latest, true);

  if (isPureBarrel(sourceFile)) return [];

  const entries: AuditEntry[] = [];
  for (const stmt of sourceFile.statements) {
    if (isReExport(stmt)) continue;

    if (ts.isFunctionDeclaration(stmt) && isExported(stmt)) {
      const entry = entryFromFunction(relPath, sourceFile, stmt);
      if (entry) entries.push(entry);
      continue;
    }

    if (ts.isVariableStatement(stmt) && isExported(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        const init = decl.initializer;
        if (!init) continue;
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          const entry = entryFromArrow(relPath, sourceFile, stmt, decl, init);
          if (entry) entries.push(entry);
        }
      }
      continue;
    }

    if (ts.isClassDeclaration(stmt) && isExported(stmt)) {
      entries.push(...entriesFromClass(relPath, sourceFile, stmt));
    }
  }
  return entries;
}

// ── public API ────────────────────────────────────────────────────────────────

/** Walk rootDir recursively and return one AuditEntry per auditable export, sorted by (file, line). */
export function auditDocstrings({ rootDir }: AuditOptions): AuditEntry[] {
  const cwd = process.cwd();
  const files = collectSrcFiles({ rootDir });
  const entries = files.flatMap((absFilePath) => parseFileEntries(absFilePath, cwd));
  return entries.sort((a, b) => {
    const fc = a.file.localeCompare(b.file);
    return fc !== 0 ? fc : a.line - b.line;
  });
}
