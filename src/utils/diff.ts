import { createTwoFilesPatch } from 'diff';
import chalk from 'chalk';

export const DIFF_LINE_CAP = 80;

export interface ComputePatchInput {
  before: string;
  after: string;
  path: string;
}

export interface RenderDiffInput {
  path: string;
  before: string;
  after: string;
  lineCap?: number;
}

/**
 * Generates a unified-diff patch string between two text blobs.
 *
 * @param input - The diff input fields:
 *   - `before` — Original (left-hand) file content.
 *   - `after` — Revised (right-hand) file content.
 *   - `path` — File path used as the header label in the patch output.
 * @returns A unified-diff string as produced by the `diff` package
 *   (`createTwoFilesPatch`). The output always includes a trailing newline
 *   and `before`/`after` header labels.
 * @remarks Pure function; performs no I/O and has no side effects.
 */
export function computeUnifiedPatch({ before, after, path }: ComputePatchInput): string {
  return createTwoFilesPatch(path, path, before, after, 'before', 'after');
}

function colorLine(line: string): string {
  if (line.startsWith('--- ') || line.startsWith('+++ ')) return line;
  if (line.startsWith('+')) return chalk.green(line);
  if (line.startsWith('-')) return chalk.red(line);
  if (line.startsWith('@@')) return chalk.dim.cyan(line);
  return line;
}

/**
 * Renders a syntax-colored unified diff suitable for terminal display.
 *
 * @param input - The render options:
 *   - `path` — File path used as the patch header label.
 *   - `before` — Original file content.
 *   - `after` — Revised file content.
 *   - `lineCap` — Maximum number of diff lines to include before truncating
 *     with a "… (N more)" trailer. Defaults to {@link DIFF_LINE_CAP} (80).
 * @returns A chalk-colored string ready for `console.log`, or an empty string
 *   (`""`) when `before` and `after` are identical.
 * @remarks Writes nothing to stdout or stderr itself; callers are responsible
 *   for printing the returned string.
 */
export function renderUnifiedDiff({ path, before, after, lineCap = DIFF_LINE_CAP }: RenderDiffInput): string {
  if (before === after) return '';
  const patch = computeUnifiedPatch({ before, after, path });
  const lines = patch.replace(/\n$/, '').split('\n');
  if (lines.length <= lineCap) return lines.map(colorLine).join('\n');
  const omitted = lines.length - lineCap;
  return [...lines.slice(0, lineCap).map(colorLine), `… (${omitted} more)`].join('\n');
}
