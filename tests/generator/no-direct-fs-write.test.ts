import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TEST_DIR, '..', '..');

const TARGET_DIRS = [
  join(REPO_ROOT, 'src', 'generator', 'cursor'),
  join(REPO_ROOT, 'src', 'generator', 'copilot'),
  join(REPO_ROOT, 'src', 'generator', 'windsurf'),
];

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\bfs\.writeFile\b/,
  /\bwriteFileSync\b/,
  /\bfs\.promises\.writeFile\b/,
  /\bwriteFile\s*\(/,
];

async function listTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await listTsFiles(full));
    } else if (entry.isFile() && full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('no direct fs.writeFile in new target generators', () => {
  it.each(TARGET_DIRS)('%s contains zero direct fs.writeFile calls', async (dir: string) => {
    const files = await listTsFiles(dir);
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(content).not.toMatch(pattern);
      }
    }
  });
});
