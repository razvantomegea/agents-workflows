import { describe, expect, it } from '@jest/globals';
import chalk from 'chalk';
import { renderUnifiedDiff, computeUnifiedPatch, DIFF_LINE_CAP } from '../../src/utils/diff.js';

const BASE = 'line1\nline2\nline3\n';

describe('computeUnifiedPatch', () => {
  it('returns a raw patch string containing standard diff headers', () => {
    const patch = computeUnifiedPatch({ before: 'a\n', after: 'b\n', path: 'file.txt' });
    expect(patch).toContain('--- file.txt');
    expect(patch).toContain('+++ file.txt');
    expect(patch).toContain('-a');
    expect(patch).toContain('+b');
  });
});

describe('renderUnifiedDiff', () => {
  it('returns empty string when before and after are identical', () => {
    const result = renderUnifiedDiff({ path: 'f.ts', before: BASE, after: BASE });
    expect(result).toBe('');
  });

  it('includes ANSI color codes for added and removed lines but not for file headers', () => {
    const savedLevel = chalk.level;
    chalk.level = 3;
    try {
      const result = renderUnifiedDiff({ path: 'f.ts', before: 'old\n', after: 'new\n' });
      expect(result).toContain(chalk.green('+new'));
      expect(result).toContain(chalk.red('-old'));
      expect(result).toContain('--- f.ts');
      expect(result).toContain('+++ f.ts');
      expect(result).not.toContain(chalk.red('--- f.ts'));
      expect(result).not.toContain(chalk.green('+++ f.ts'));
    } finally {
      chalk.level = savedLevel;
    }
  });

  it('truncates to lineCap and appends "… (N more)" footer with correct count', () => {
    const beforeLines = Array.from({ length: 60 }, (_, index) => `line${index}`).join('\n');
    const afterLines = Array.from({ length: 60 }, (_, index) => `changed${index}`).join('\n');
    const lineCap = 10;
    const result = renderUnifiedDiff({ path: 'big.ts', before: beforeLines, after: afterLines, lineCap });
    const outputLines = result.split('\n');
    expect(outputLines.length).toBe(lineCap + 1);
    const expectedTotal = computeUnifiedPatch({ before: beforeLines, after: afterLines, path: 'big.ts' }).replace(/\n$/, '').split('\n').length;
    expect(outputLines[lineCap]).toBe(`… (${expectedTotal - lineCap} more)`);
  });

  it('uses DIFF_LINE_CAP as default cap and does not truncate small diffs', () => {
    const result = renderUnifiedDiff({ path: 'f.ts', before: 'a\n', after: 'b\n' });
    expect(result).not.toContain('… (');
    expect(result.split('\n').length).toBeLessThanOrEqual(DIFF_LINE_CAP);
  });

  it('includes both changed regions in a multi-hunk diff', () => {
    const shared = Array.from({ length: 12 }, (_, index) => `shared${index}`).join('\n');
    const before = `aaa\n${shared}\nbbb\n`;
    const after = `AAA\n${shared}\nBBB\n`;
    const result = renderUnifiedDiff({ path: 'multi.ts', before, after });
    const hunkCount = (result.match(/^@@ /gm) ?? []).length;
    expect(hunkCount).toBeGreaterThanOrEqual(2);
    expect(result).toContain('aaa');
    expect(result).toContain('AAA');
    expect(result).toContain('bbb');
    expect(result).toContain('BBB');
  });
});
