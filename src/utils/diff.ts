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

export function renderUnifiedDiff({ path, before, after, lineCap = DIFF_LINE_CAP }: RenderDiffInput): string {
  if (before === after) return '';
  const patch = computeUnifiedPatch({ before, after, path });
  const lines = patch.replace(/\n$/, '').split('\n');
  if (lines.length <= lineCap) return lines.map(colorLine).join('\n');
  const omitted = lines.length - lineCap;
  return [...lines.slice(0, lineCap).map(colorLine), `… (${omitted} more)`].join('\n');
}
