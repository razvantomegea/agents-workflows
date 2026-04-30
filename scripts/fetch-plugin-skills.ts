import { readFile, writeFile, mkdir, lstat, realpath, rename, rm } from 'node:fs/promises';
import { join, dirname, resolve, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGINS_DIR = join(ROOT_DIR, 'src', 'plugins');
const SOURCES_FILE = join(ROOT_DIR, 'plugin-sources.json');
const GIT_SHA_PATTERN = /^[a-f0-9]{40}$/i;
const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const GITHUB_SOURCE_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const RELATIVE_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;

interface PluginSource {
  source: string;
  refOrSha: string;
  basePath?: string;
  skills: Record<string, string>;
}

interface PluginSources {
  [pluginId: string]: PluginSource;
}

interface BuildRawUrlParams {
  source: string;
  refOrSha: string;
  basePath?: string;
  skillPath: string;
}

interface WriteSkillFileParams {
  pluginId: string;
  skillId: string;
  content: string;
}

function buildRawUrl({ source, refOrSha, basePath, skillPath }: BuildRawUrlParams): string {
  assertGithubSource(source);
  assertSafeRelativePath('basePath', basePath);
  assertSafeRelativePath('skillPath', skillPath);
  const base = basePath ? `${basePath}/` : '';
  return `https://raw.githubusercontent.com/${source}/${refOrSha}/${base}${skillPath}`;
}

function assertGithubSource(source: string): void {
  if (!GITHUB_SOURCE_PATTERN.test(source)) {
    throw new Error(`Invalid GitHub source: ${source}`);
  }

  for (const segment of source.split('/')) {
    if (segment === '.' || segment === '..') {
      throw new Error(`Invalid GitHub source: ${source}`);
    }
  }
}

function assertSafeRelativePath(label: string, value: string | undefined): void {
  if (value === undefined) return;
  if (value.length === 0 || value.startsWith('/') || value.includes('\\') || value.includes('?') || value.includes('#')) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  for (const segment of value.split('/')) {
    if (segment === '.' || segment === '..' || !RELATIVE_PATH_SEGMENT_PATTERN.test(segment)) {
      throw new Error(`Invalid ${label}: ${value}`);
    }
  }
}

function assertSafeId(label: string, value: string): void {
  if (!PLUGIN_ID_PATTERN.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function assertPinnedSha(pluginId: string, refOrSha: string): void {
  if (!GIT_SHA_PATTERN.test(refOrSha)) {
    throw new Error(`refOrSha for ${pluginId} must be a 40-character git commit SHA`);
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

async function ensurePluginDirectory(pluginId: string, skillId: string): Promise<string> {
  const expectedSrcRoot = resolve(ROOT_DIR, 'src');
  const expectedPluginsRoot = resolve(ROOT_DIR, 'src', 'plugins');
  const realRoot = await realpath(ROOT_DIR);
  const srcStat = await lstat(expectedSrcRoot).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) {
      return null;
    }
    throw error;
  });

  if (srcStat?.isSymbolicLink()) {
    throw new Error(`Refusing to write through symlink: ${expectedSrcRoot}`);
  }

  if (srcStat && !srcStat.isDirectory()) {
    throw new Error(`Refusing to write through non-directory: ${expectedSrcRoot}`);
  }

  if (!srcStat) {
    await mkdir(expectedSrcRoot);
  }

  const srcRoot = await realpath(expectedSrcRoot);
  if (srcRoot !== expectedSrcRoot || !srcRoot.startsWith(`${realRoot}${sep}`)) {
    throw new Error(`Refusing to write outside repository source directory: ${expectedSrcRoot}`);
  }

  const rootStat = await lstat(PLUGINS_DIR).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) {
      return null;
    }
    throw error;
  });

  if (rootStat?.isSymbolicLink()) {
    throw new Error(`Refusing to write through symlink: ${PLUGINS_DIR}`);
  }

  if (rootStat && !rootStat.isDirectory()) {
    throw new Error(`Refusing to write through non-directory: ${PLUGINS_DIR}`);
  }

  if (!rootStat) {
    await mkdir(PLUGINS_DIR);
  }

  const pluginsRoot = await realpath(PLUGINS_DIR);
  const isUnderRepoRoot = pluginsRoot !== realRoot && pluginsRoot.startsWith(`${realRoot}${sep}`);
  if (pluginsRoot !== expectedPluginsRoot || !isUnderRepoRoot) {
    throw new Error(`Refusing to write outside repository plugins directory: ${PLUGINS_DIR}`);
  }

  let currentPath = pluginsRoot;

  for (const segment of [pluginId, skillId]) {
    currentPath = resolve(currentPath, segment);
    if (!currentPath.startsWith(`${pluginsRoot}${sep}`)) {
      throw new Error(`Refusing to write outside plugins directory: ${pluginId}/${skillId}`);
    }

    const stat = await lstat(currentPath).catch((error: unknown) => {
      if (hasErrorCode(error, 'ENOENT')) {
        return null;
      }
      throw error;
    });

    if (stat?.isSymbolicLink()) {
      throw new Error(`Refusing to write through symlink: ${pluginId}/${skillId}`);
    }

    if (stat && !stat.isDirectory()) {
      throw new Error(`Refusing to write through non-directory: ${pluginId}/${skillId}`);
    }

    if (!stat) {
      await mkdir(currentPath);
    }
  }

  return currentPath;
}

async function fetchSkill(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.text();
}

async function writeSkillFile({ pluginId, skillId, content }: WriteSkillFileParams): Promise<string> {
  assertSafeId('pluginId', pluginId);
  assertSafeId('skillId', skillId);
  const skillDir = await ensurePluginDirectory(pluginId, skillId);
  const filePath = join(skillDir, 'SKILL.md');
  const fileStat = await lstat(filePath).catch((error: unknown) => {
    if (hasErrorCode(error, 'ENOENT')) {
      return null;
    }
    throw error;
  });
  if (fileStat?.isSymbolicLink()) {
    throw new Error(`Refusing to overwrite symlink: ${pluginId}/${skillId}/SKILL.md`);
  }

  const tempPath = join(skillDir, `.SKILL.md.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, content, { encoding: 'utf-8', flag: 'wx' });
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
  return createHash('sha256').update(content).digest('hex');
}

async function main(): Promise<void> {
  const raw = await readFile(SOURCES_FILE, 'utf-8');
  const sources: PluginSources = JSON.parse(raw);

  let totalFetched = 0;
  let totalFailed = 0;

  for (const [pluginId, pluginSource] of Object.entries(sources)) {
    console.log(`\nFetching ${pluginId} from ${pluginSource.source}...`);

    const refOrSha = typeof pluginSource.refOrSha === 'string' ? pluginSource.refOrSha.trim() : '';
    if (!refOrSha) {
      throw new Error(`Missing refOrSha for plugin source: ${pluginId}`);
    }
    assertPinnedSha(pluginId, refOrSha);

    for (const [skillId, skillPath] of Object.entries(pluginSource.skills)) {
      const url = buildRawUrl({
        source: pluginSource.source,
        refOrSha,
        basePath: pluginSource.basePath,
        skillPath,
      });
      try {
        const content = await fetchSkill(url);
        const hash = await writeSkillFile({ pluginId, skillId, content });
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
