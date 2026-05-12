import { readFile, readdir } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { fileExists } from '../../utils/file-exists.js';

function parseGoWork(content: string): string[] | null {
  const lines = content.split(/\r?\n/);
  const results: string[] = [];
  let inBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\/\/.*$/, '').trim();
    if (!inBlock) {
      if (/^use\s+\(/.test(line)) {
        inBlock = true;
        continue;
      }
      const standalone = line.match(/^use\s+(\S+)$/);
      if (standalone) results.push(standalone[1].replace(/^\.\//, ''));
      continue;
    }
    if (line === ')') {
      inBlock = false;
      continue;
    }
    if (line) results.push(line.replace(/^\.\//, ''));
  }

  return results.length > 0 ? results : null;
}

/**
 * Reads the `use` directives from a `go.work` file.
 *
 * Handles both single-line (`use ./dir`) and block form (`use ( ... )`) syntax.
 * Leading `./` prefixes are stripped from each path. Inline `//` comments are
 * ignored.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns An array of module directory paths (e.g. `["services/api", "libs/core"]`),
 *   or `null` when `go.work` is absent, unreadable, or contains no `use` directives.
 * @throws {NodeJS.ErrnoException} When `readFile` fails for a reason other than ENOENT
 *   after `fileExists` returned `true`.
 * @remarks Reads `go.work` at `projectRoot`.
 */
export async function readGoWork(projectRoot: string): Promise<string[] | null> {
  const file = join(projectRoot, 'go.work');
  if (!(await fileExists(file))) return null;
  const content = await readFile(file, 'utf-8');
  return parseGoWork(content);
}

function parseDotnetSolution(content: string): string[] | null {
  const re = /^Project\("[^"\n\r]*"\)\s*=\s*"[^"\n\r]*",\s*"([^"\n\r]*\.csproj)"/gm;
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const normalized = match[1].replace(/\\/g, '/');
    const dirname = posix.dirname(normalized).replace(/^\.\//, '');
    if (dirname && dirname !== '.') {
      results.push(dirname);
    }
  }
  return results.length > 0 ? results : null;
}

/**
 * Reads project directories from the first `*.sln` solution file found in
 * `projectRoot`.
 *
 * Parses `Project(...)` lines and extracts the directory component of each
 * `*.csproj` path. Backslashes are normalized to forward slashes.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns An array of project directory paths (e.g. `["src/Api", "src/Core"]`),
 *   or `null` when no `*.sln` file is present or no `*.csproj` references are found.
 * @throws {NodeJS.ErrnoException} Re-throws `readdir` errors other than ENOENT.
 *   Also throws if the `*.sln` file exists but cannot be read.
 * @remarks Performs one `readdir` on `projectRoot` and one `readFile` on the
 *   solution file. ENOENT on `readdir` is silently treated as an empty directory.
 */
export async function readDotnetSolution(projectRoot: string): Promise<string[] | null> {
  const entries = await readdir(projectRoot).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [] as string[];
    throw error;
  });
  const slnFile = entries.find((entry) => entry.endsWith('.sln'));
  if (!slnFile) return null;
  const content = await readFile(join(projectRoot, slnFile), 'utf-8');
  return parseDotnetSolution(content);
}

function parseCmakeSubdirs(content: string): string[] | null {
  const re = /^\s*add_subdirectory\(\s*([^)\s]+)\s*\)/;
  const results: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trimStart();
    if (trimmed.startsWith('#')) continue;
    const match = trimmed.match(re);
    if (match) results.push(match[1]);
  }

  return results.length > 0 ? results : null;
}

/**
 * Reads subdirectory names from `add_subdirectory()` calls in `CMakeLists.txt`.
 *
 * Lines starting with `#` are treated as comments and skipped. Only the first
 * argument of each `add_subdirectory(...)` call is extracted.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns An array of subdirectory names (e.g. `["core", "tests"]`), or `null`
 *   when `CMakeLists.txt` is absent, unreadable, or contains no
 *   `add_subdirectory` calls.
 * @throws {NodeJS.ErrnoException} When `readFile` fails for a reason other than ENOENT
 *   after `fileExists` returned `true`.
 * @remarks Reads `CMakeLists.txt` at `projectRoot`.
 */
export async function readCmakeSubdirs(projectRoot: string): Promise<string[] | null> {
  const file = join(projectRoot, 'CMakeLists.txt');
  if (!(await fileExists(file))) return null;
  const content = await readFile(file, 'utf-8');
  return parseCmakeSubdirs(content);
}
