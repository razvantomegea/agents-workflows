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

let cache: PartialEntry[] | null = null;

export async function listPartials(): Promise<PartialEntry[]> {
  if (cache) return cache;
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
  cache = partials;
  return partials;
}

export function _resetPartialsCache(): void {
  cache = null;
}
