import { readdir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';
import type { Detection } from './types.js';
import { containsAny, tryReadFile } from './text-match.js';
import { BACKEND_FRAMEWORK_CONFIDENCE } from '../constants/frameworks.js';

const ASPNETCORE_NEEDLES: readonly string[] = ['Microsoft.AspNetCore.'];
const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules', '.git', 'bin', 'obj', '.agents-workflows-backup', 'dist',
]);

async function findCsprojFiles(projectRoot: string): Promise<string[]> {
  const collected: string[] = [];

  let rootEntries: Dirent[];
  try {
    rootEntries = await readdir(projectRoot, { withFileTypes: true });
  } catch {
    // reason: ENOENT or permission errors on root are silently skipped per spec
    return [];
  }

  for (const entry of rootEntries) {
    if (entry.isFile() && entry.name.endsWith('.csproj')) {
      collected.push(join(projectRoot, entry.name));
    } else if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      try {
        const subEntries = await readdir(join(projectRoot, entry.name), { withFileTypes: true });
        for (const sub of subEntries) {
          if (sub.isFile() && sub.name.endsWith('.csproj')) {
            collected.push(join(projectRoot, entry.name, sub.name));
          }
        }
      } catch {
        // reason: unreadable subdirectories are silently skipped per spec
      }
    }
  }

  collected.sort();
  return collected;
}

/**
 * Detects whether the project uses the ASP.NET Core framework.
 *
 * Scans `*.csproj` files in the project root and one level of subdirectories
 * (excluding `node_modules`, `.git`, `bin`, `obj`, `dist`, and
 * `.agents-workflows-backup`). Each `.csproj` file is read and checked for
 * the string `"Microsoft.AspNetCore."`.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` with `value: "aspnetcore"` when an ASP.NET Core project
 *   file is found, or `{ value: null, confidence: 0 }` otherwise.
 * @remarks Performs one `readdir` on `projectRoot` and potentially one additional
 *   `readdir` per non-skipped subdirectory, plus one `readFile` per `.csproj`.
 *   `readdir` and `readFile` errors on subdirectories are silently skipped;
 *   an ENOENT or permission error on `projectRoot` itself returns `[]` (no matches).
 */
export async function detectDotnetFramework(projectRoot: string): Promise<Detection> {
  const csprojPaths = await findCsprojFiles(projectRoot);
  for (const csprojPath of csprojPaths) {
    const content = await tryReadFile(csprojPath);
    if (content !== null && containsAny(content, ASPNETCORE_NEEDLES)) {
      return { value: 'aspnetcore', confidence: BACKEND_FRAMEWORK_CONFIDENCE['aspnetcore'] };
    }
  }

  return { value: null, confidence: 0 };
}
