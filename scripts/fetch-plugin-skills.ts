import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGINS_DIR = join(ROOT_DIR, 'src', 'plugins');
const SOURCES_FILE = join(ROOT_DIR, 'plugin-sources.json');

interface PluginSource {
  source: string;
  basePath?: string;
  skills: Record<string, string>;
}

interface PluginSources {
  [pluginId: string]: PluginSource;
}

function buildRawUrl(source: string, basePath: string | undefined, skillPath: string): string {
  const base = basePath ? `${basePath}/` : '';
  return `https://raw.githubusercontent.com/${source}/HEAD/${base}${skillPath}`;
}

async function fetchSkill(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.text();
}

async function writeSkillFile(pluginId: string, skillId: string, content: string): Promise<string> {
  const skillDir = join(PLUGINS_DIR, pluginId, skillId);
  await mkdir(skillDir, { recursive: true });
  const filePath = join(skillDir, 'SKILL.md');
  await writeFile(filePath, content, 'utf-8');
  return createHash('sha256').update(content).digest('hex');
}

async function main(): Promise<void> {
  const raw = await readFile(SOURCES_FILE, 'utf-8');
  const sources: PluginSources = JSON.parse(raw);

  let totalFetched = 0;
  let totalFailed = 0;

  for (const [pluginId, pluginSource] of Object.entries(sources)) {
    console.log(`\nFetching ${pluginId} from ${pluginSource.source}...`);

    for (const [skillId, skillPath] of Object.entries(pluginSource.skills)) {
      const url = buildRawUrl(pluginSource.source, pluginSource.basePath, skillPath);
      try {
        const content = await fetchSkill(url);
        const hash = await writeSkillFile(pluginId, skillId, content);
        console.log(`  ✓ ${skillId} (sha256: ${hash.slice(0, 16)}...)`);
        totalFetched++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ ${skillId}: ${message}`);
        totalFailed++;
      }
    }
  }

  console.log(`\nDone: ${totalFetched} fetched, ${totalFailed} failed`);

  if (totalFailed > 0) {
    console.error('Some skills failed to fetch. Check paths in plugin-sources.json.');
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error('Fatal:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
