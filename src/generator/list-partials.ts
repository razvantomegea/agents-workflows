import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PARTIALS_DIR = join(MODULE_DIR, '..', 'templates', 'partials');
const PARTIAL_FILE_RE = /^([a-z][a-z0-9-]*)\.md\.ejs$/;

export interface PartialEntry {
  slug: string;
  templatePath: string;
  absolutePath: string;
}

let cache: readonly PartialEntry[] | null = null;

/**
 * Discovers all partial templates in the `src/templates/partials/` directory.
 *
 * Reads `src/templates/partials/`, filters for files matching
 * `<slug>.md.ejs` (where slug is `[a-z][a-z0-9-]*`), and returns one
 * `PartialEntry` per file sorted alphabetically by slug.  Results are
 * module-level cached after the first call; subsequent calls return shallow
 * clones from the frozen cache.
 *
 * @returns An array of `PartialEntry` objects each containing `slug`,
 *   `templatePath` (relative path for `renderTemplate`), and `absolutePath`.
 * @throws Any filesystem error from `readdir` (e.g. `ENOENT` if the partials
 *   directory is missing).
 */
export async function listPartials(): Promise<PartialEntry[]> {
  if (cache) return cache.map(clonePartialEntry);
  const entries = await readdir(PARTIALS_DIR, { withFileTypes: true });
  const partials: PartialEntry[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = PARTIAL_FILE_RE.exec(entry.name);
    if (!match) continue;
    const slug = match[1];
    if (!slug) continue;
    partials.push({
      slug,
      templatePath: `partials/${entry.name}`,
      absolutePath: join(PARTIALS_DIR, entry.name),
    });
  }
  partials.sort((a: PartialEntry, b: PartialEntry) => a.slug.localeCompare(b.slug));
  cache = Object.freeze(partials.map((partial: PartialEntry) => Object.freeze(clonePartialEntry(partial))));
  return cache.map(clonePartialEntry);
}

/**
 * Clears the module-level partials cache.
 *
 * Forces the next `listPartials` call to re-read the partials directory from
 * disk.  Intended for use in tests that add or remove partial files during a
 * test run.
 */
export function _resetPartialsCache(): void {
  cache = null;
}

function clonePartialEntry(partial: PartialEntry): PartialEntry {
  return {
    slug: partial.slug,
    templatePath: partial.templatePath,
    absolutePath: partial.absolutePath,
  };
}
