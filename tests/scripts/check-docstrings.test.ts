/**
 * End-to-end tests for the docstring guard.
 * Uses real tmp dirs so auditDocstrings (which walks a directory) is exercised
 * end-to-end, maximising branch coverage on scripts/lib/docstring-audit.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { auditDocstrings, type AuditEntry } from '../../scripts/lib/docstring-audit.js';
import { runCheck } from '../../scripts/check-docstrings.js';
import {
  DOCUMENTED_FUNCTION, UNDOCUMENTED_FUNCTION, OUT_OF_SCOPE_ONLY,
  DOCUMENTED_ARROW, UNDOCUMENTED_ARROW, DOCUMENTED_CLASS,
  PURE_BARREL, ONE_LINE_PASSTHROUGH_FN, ONE_LINE_PASSTHROUGH_ARROW,
  TWO_EXPORTS_SAME_FILE, ANONYMOUS_CLASS, FUNCTION_EXPRESSION,
  SECOND_DOCUMENTED_FUNCTION, CLASS_WITH_PROPERTY_AND_COMPUTED, UNINITIALIZED_VAR,
} from './fixtures.js';

function writeSource(dir: string, filename: string, source: string): void {
  fs.writeFileSync(path.join(dir, filename), source, 'utf-8');
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'docstring-test-'));
}

describe('documented export — case (a)', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir(); writeSource(tmpDir, 'add.ts', DOCUMENTED_FUNCTION); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('audit entry has hasDocstring true', () => {
    const [entry] = auditDocstrings({ rootDir: tmpDir }) as [AuditEntry];
    expect(entry.hasDocstring).toBe(true);
  });

  it('runCheck exits 0', () => {
    expect(runCheck({ rootDir: tmpDir }).exitCode).toBe(0);
  });

  it('runCheck returns empty gaps', () => {
    expect(runCheck({ rootDir: tmpDir }).gaps).toHaveLength(0);
  });
});

describe('undocumented export — case (b)', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir(); writeSource(tmpDir, 'sub.ts', UNDOCUMENTED_FUNCTION); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('audit entry has hasDocstring false', () => {
    const [entry] = auditDocstrings({ rootDir: tmpDir }) as [AuditEntry];
    expect(entry.hasDocstring).toBe(false);
  });

  it('runCheck exits 1', () => {
    expect(runCheck({ rootDir: tmpDir }).exitCode).toBe(1);
  });

  it('gap exportName is "subtract"', () => {
    expect((runCheck({ rootDir: tmpDir }).gaps[0] as AuditEntry).exportName).toBe('subtract');
  });

  it('formatted gap matches "path:line name" shape', () => {
    const g = runCheck({ rootDir: tmpDir }).gaps[0] as AuditEntry;
    expect(`${g.file}:${g.line} ${g.exportName}`).toMatch(/\S+:\d+ subtract$/);
  });
});

describe('out-of-scope exports only — case (c)', () => {
  let tmpDir: string;
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('audit returns zero entries for type/interface/re-export/const', () => {
    tmpDir = makeTmpDir(); writeSource(tmpDir, 'types.ts', OUT_OF_SCOPE_ONLY);
    expect(auditDocstrings({ rootDir: tmpDir })).toHaveLength(0);
  });

  it('runCheck exits 0', () => {
    tmpDir = makeTmpDir(); writeSource(tmpDir, 'types.ts', OUT_OF_SCOPE_ONLY);
    expect(runCheck({ rootDir: tmpDir }).exitCode).toBe(0);
  });

  it('uninitialized variable declaration yields zero entries', () => {
    tmpDir = makeTmpDir(); writeSource(tmpDir, 'vars.ts', UNINITIALIZED_VAR);
    expect(auditDocstrings({ rootDir: tmpDir })).toHaveLength(0);
  });
});

describe('arrow function exports', () => {
  let tmpDir: string;
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('documented arrow: hasDocstring true, kind "arrow"', () => {
    tmpDir = makeTmpDir();
    writeSource(tmpDir, 'multiply.ts', DOCUMENTED_ARROW);
    const [entry] = auditDocstrings({ rootDir: tmpDir }) as [AuditEntry];
    expect(entry.hasDocstring).toBe(true);
    expect(entry.kind).toBe('arrow');
  });

  it('undocumented arrow: hasDocstring false', () => {
    tmpDir = makeTmpDir();
    writeSource(tmpDir, 'divide.ts', UNDOCUMENTED_ARROW);
    const [entry] = auditDocstrings({ rootDir: tmpDir }) as [AuditEntry];
    expect(entry.hasDocstring).toBe(false);
  });

  it('one-line passthrough arrow yields zero entries', () => {
    tmpDir = makeTmpDir();
    writeSource(tmpDir, 'pass.ts', ONE_LINE_PASSTHROUGH_ARROW);
    expect(auditDocstrings({ rootDir: tmpDir })).toHaveLength(0);
  });

  it('function expression assigned to const: kind "arrow"', () => {
    tmpDir = makeTmpDir();
    writeSource(tmpDir, 'compute.ts', FUNCTION_EXPRESSION);
    const [entry] = auditDocstrings({ rootDir: tmpDir }) as [AuditEntry];
    expect(entry.kind).toBe('arrow');
  });
});

describe('class method exports', () => {
  let tmpDir: string;
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('includes only the public documented method', () => {
    tmpDir = makeTmpDir(); writeSource(tmpDir, 'calc.ts', DOCUMENTED_CLASS);
    const [entry] = auditDocstrings({ rootDir: tmpDir }) as [AuditEntry];
    expect(entry.kind).toBe('method');
  });

  it('private and protected methods are excluded', () => {
    tmpDir = makeTmpDir(); writeSource(tmpDir, 'calc.ts', DOCUMENTED_CLASS);
    const names = auditDocstrings({ rootDir: tmpDir }).map((e) => e.exportName);
    expect(names).not.toContain('Calculator.secret');
    expect(names).not.toContain('Calculator.hidden');
  });

  it('skips property members and computed method names, keeps only identifier-named methods', () => {
    tmpDir = makeTmpDir(); writeSource(tmpDir, 'holder.ts', CLASS_WITH_PROPERTY_AND_COMPUTED);
    const entries = auditDocstrings({ rootDir: tmpDir });
    expect(entries.every((e) => e.exportName === 'Holder.get')).toBe(true);
  });
});

describe('pure barrel file', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir(); writeSource(tmpDir, 'index.ts', PURE_BARREL); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns zero entries for a pure re-export barrel', () => {
    expect(auditDocstrings({ rootDir: tmpDir })).toHaveLength(0);
  });
});

describe('one-line passthrough function declaration', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir(); writeSource(tmpDir, 'pt.ts', ONE_LINE_PASSTHROUGH_FN); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns zero entries', () => {
    expect(auditDocstrings({ rootDir: tmpDir })).toHaveLength(0);
  });
});

describe('sort order', () => {
  let tmpDir: string;
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns entries in ascending line order within the same file', () => {
    tmpDir = makeTmpDir(); writeSource(tmpDir, 'multi.ts', TWO_EXPORTS_SAME_FILE);
    const entries = auditDocstrings({ rootDir: tmpDir });
    expect((entries[0] as AuditEntry).exportName).toBe('first');
    expect((entries[1] as AuditEntry).exportName).toBe('second');
  });

  it('sorts entries from different files alphabetically by file path', () => {
    tmpDir = makeTmpDir();
    writeSource(tmpDir, 'aaa.ts', DOCUMENTED_FUNCTION);
    writeSource(tmpDir, 'bbb.ts', SECOND_DOCUMENTED_FUNCTION);
    const entries = auditDocstrings({ rootDir: tmpDir });
    expect((entries[0] as AuditEntry).exportName).toBe('add');
    expect((entries[1] as AuditEntry).exportName).toBe('increment');
  });
});

describe('anonymous class export', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir(); writeSource(tmpDir, 'anon.ts', ANONYMOUS_CLASS); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('uses "(anonymous)" as className prefix for anonymous class methods', () => {
    const entries = auditDocstrings({ rootDir: tmpDir });
    expect(entries.some((e) => e.exportName.startsWith('(anonymous)'))).toBe(true);
  });
});
