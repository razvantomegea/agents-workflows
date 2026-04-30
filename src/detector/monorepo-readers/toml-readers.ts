import { readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { fileExists } from '../../utils/file-exists.js';

interface ParseTomlArrayParams {
  content: string;
  sectionHeader: string;
  key: string;
}

function parseTomlArrayMembers({ content, sectionHeader, key }: ParseTomlArrayParams): string[] | null {
  const lines = content.split(/\r?\n/);
  const results: string[] = [];
  let inSection = false;
  let inArray = false;
  const escapedHeader = sectionHeader.replace(/\./g, '\\.');
  const sectionRe = new RegExp(`^\\[${escapedHeader}\\]$`);
  const keyRe = new RegExp(`^${key}\\s*=\\s*\\[`);

  for (const rawLine of lines) {
    const trimmed = rawLine.replace(/#.*$/, '').trim();
    if (!inSection) {
      if (sectionRe.test(trimmed)) inSection = true;
      continue;
    }
    if (trimmed.startsWith('[') && !inArray) {
      if (trimmed.startsWith(`[${sectionHeader}.`)) continue; // subsection of current section — stay in
      inSection = false;
      continue;
    }
    if (!inArray) {
      if (keyRe.test(trimmed)) {
        inArray = true;
        const afterBracket = trimmed.replace(/^[^[]*\[/, '');
        extractQuotedValues(afterBracket, results);
        if (afterBracket.includes(']')) break;
      }
      continue;
    }
    if (trimmed.includes(']')) {
      extractQuotedValues(trimmed.replace(/].*$/, ''), results);
      break;
    }
    extractQuotedValues(trimmed, results);
  }

  return results.length > 0 ? results : null;
}

function extractQuotedValues(text: string, out: string[]): void {
  const re = /["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push(match[1]);
  }
}

function extractIncludeAndFromValues(text: string, out: string[]): void {
  const re = /\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const include = match[1].match(/include\s*=\s*["']([^"']+)["']/)?.[1];
    if (include === undefined) continue;
    const from = match[1].match(/from\s*=\s*["']([^"']+)["']/)?.[1];
    out.push(from === undefined ? include : posix.join(from, include));
  }
}

async function readPyprojectTomlRaw(projectRoot: string): Promise<string | null> {
  const file = join(projectRoot, 'pyproject.toml');
  if (!(await fileExists(file))) return null;
  return readFile(file, 'utf-8');
}

/**
 * Reads the `[workspace].members` array from a `Cargo.toml` file.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns An array of workspace member paths (e.g. `["crates/core", "crates/cli"]`),
 *   or `null` when `Cargo.toml` is absent, unreadable, or has no `[workspace].members`
 *   array.
 * @throws {NodeJS.ErrnoException} When `readFile` fails for a reason other than ENOENT
 *   after `fileExists` returned `true` (e.g. permission denied).
 * @remarks Reads `Cargo.toml` at `projectRoot`. Uses a line-by-line TOML parser
 *   that handles inline comments and multi-line arrays.
 */
export async function readCargoWorkspace(projectRoot: string): Promise<string[] | null> {
  const file = join(projectRoot, 'Cargo.toml');
  if (!(await fileExists(file))) return null;
  const content = await readFile(file, 'utf-8');
  return parseTomlArrayMembers({ content, sectionHeader: 'workspace', key: 'members' });
}

/**
 * Reads the `[tool.uv.workspace].members` array from `pyproject.toml`.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns An array of workspace member paths, or `null` when `pyproject.toml`
 *   is absent, unreadable, or contains no `[tool.uv.workspace]` section.
 * @throws {NodeJS.ErrnoException} When `readFile` fails for a reason other than ENOENT
 *   after `fileExists` returned `true`.
 * @remarks Reads `pyproject.toml` at `projectRoot`. Uses a line-by-line TOML parser.
 */
export async function readUvWorkspace(projectRoot: string): Promise<string[] | null> {
  const content = await readPyprojectTomlRaw(projectRoot);
  if (content === null) return null;
  return parseTomlArrayMembers({ content, sectionHeader: 'tool.uv.workspace', key: 'members' });
}

function parsePoetryPackages(content: string): string[] | null {
  const lines = content.split(/\r?\n/);
  const results: string[] = [];
  let inSection = false;
  let inArray = false;
  const arrayContent: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.replace(/#.*$/, '').trim();
    if (!inSection) {
      if (/^\[tool\.poetry\]\s*$/.test(trimmed)) inSection = true;
      continue;
    }
    if (trimmed.startsWith("[") && !inArray) {
      inSection = false;
      continue;
    }
    if (!inArray) {
      if (/^packages\s*=\s*\[/.test(trimmed)) {
        inArray = true;
        const afterBracket = trimmed.replace(/^[^[]*\[/, '');
        arrayContent.push(afterBracket);
        if (afterBracket.includes(']')) {
          extractIncludeAndFromValues(arrayContent.join(' ').replace(/].*$/, ''), results);
          break;
        }
      }
      continue;
    }
    arrayContent.push(trimmed);
    if (trimmed.includes(']')) {
      extractIncludeAndFromValues(arrayContent.join(' ').replace(/].*$/, ''), results);
      break;
    }
  }

  return results.length > 0 ? results : null;
}

/**
 * Reads the `[tool.poetry].packages` array from `pyproject.toml`.
 *
 * Each entry uses the `{ include = "name", from = "dir" }` inline-table syntax.
 * Paths are resolved as `posix.join(from, include)` when a `from` field is present,
 * or just `include` otherwise.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns An array of resolved workspace paths, or `null` when `pyproject.toml`
 *   is absent, unreadable, or has no `[tool.poetry]` packages array.
 * @throws {NodeJS.ErrnoException} When `readFile` fails for a reason other than ENOENT
 *   after `fileExists` returned `true`.
 * @remarks Reads `pyproject.toml` at `projectRoot`. Uses a line-by-line parser.
 */
export async function readPoetryWorkspace(projectRoot: string): Promise<string[] | null> {
  const content = await readPyprojectTomlRaw(projectRoot);
  if (content === null) return null;
  return parsePoetryPackages(content);
}
