/**
 * File-system helpers for the docstring audit.
 * Collects .ts files recursively while skipping out-of-scope paths.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Substring patterns to skip when walking files. Not full-glob semantics — intentional. */
export const OUT_OF_SCOPE_GLOBS: readonly string[] = ['**/dist/**', '**/coverage/**', '**/*.ejs'];

function isOutOfScope(relPath: string): boolean {
  // Perform simple substring/suffix checks rather than full glob matching.
  // The patterns are stable and well-defined; pulling a glob library is unnecessary.
  // Match both nested paths and root-level dist/ or coverage/ entries.
  return (
    relPath.startsWith('dist/') ||
    relPath.includes('/dist/') ||
    relPath.startsWith('coverage/') ||
    relPath.includes('/coverage/') ||
    relPath.endsWith('.ejs')
  );
}

function collectTsFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      // Refuse to follow symlinks: a link inside rootDir pointing outside (e.g. ~/.ssh)
      // would otherwise leak its contents into the audit output.
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFilesRecursive(abs));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(abs);
    }
  }
  return results;
}

/** Walk rootDir and return absolute paths to .ts files that are in scope. */
export function collectSrcFiles({ rootDir }: { rootDir: string }): string[] {
  const absRoot = path.resolve(rootDir);
  const cwd = process.cwd();
  return collectTsFilesRecursive(absRoot).filter((abs) => {
    const rel = path.relative(cwd, abs).split(path.sep).join('/');
    return !isOutOfScope(rel);
  });
}
