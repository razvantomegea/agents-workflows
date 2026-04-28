import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import { readPackageJson } from '../utils/read-package-json.js';
import {
  readCargoWorkspace,
  readGoWork,
  readUvWorkspace,
  readPoetryWorkspace,
  readDotnetSolution,
  readCmakeSubdirs,
} from './monorepo-readers.js';

export type MonorepoTool =
  | 'pnpm'
  | 'npm'
  | 'yarn'
  | 'lerna'
  | 'turbo'
  | 'nx'
  | 'cargo'
  | 'go-work'
  | 'uv'
  | 'poetry'
  | 'dotnet-sln'
  | 'cmake';

export interface MonorepoInfo {
  isMonorepo: boolean;
  tool: MonorepoTool | null;
  workspaces: string[];
}

export async function detectMonorepo(projectRoot: string): Promise<MonorepoInfo> {
  const patterns = await readWorkspacePatterns(projectRoot);
  if (!patterns) return { isMonorepo: false, tool: null, workspaces: [] };

  const workspaces = await expandWorkspacePatterns(projectRoot, patterns.patterns);
  return {
    isMonorepo: workspaces.length > 0,
    tool: patterns.tool,
    workspaces,
  };
}

interface WorkspacePatternsResult {
  patterns: string[];
  tool: MonorepoTool;
}

async function readWorkspacePatterns(projectRoot: string): Promise<WorkspacePatternsResult | null> {
  const pnpm = await readPnpmWorkspace(projectRoot);
  if (pnpm) return { patterns: pnpm, tool: 'pnpm' };

  const pkg = await readPackageJson(projectRoot);
  if (pkg?.workspaces) {
    const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages;
    if (patterns?.length) return { patterns, tool: inferNpmOrYarn(projectRoot) };
  }

  const lerna = await readLernaPackages(projectRoot);
  if (lerna) return { patterns: lerna, tool: 'lerna' };

  const cargo = await readCargoWorkspace(projectRoot);
  if (cargo) return { patterns: cargo, tool: 'cargo' };

  const goWork = await readGoWork(projectRoot);
  if (goWork) return { patterns: goWork, tool: 'go-work' };

  const uv = await readUvWorkspace(projectRoot);
  if (uv) return { patterns: uv, tool: 'uv' };

  const poetry = await readPoetryWorkspace(projectRoot);
  if (poetry) return { patterns: poetry, tool: 'poetry' };

  const dotnet = await readDotnetSolution(projectRoot);
  if (dotnet) return { patterns: dotnet, tool: 'dotnet-sln' };

  const cmake = await readCmakeSubdirs(projectRoot);
  if (cmake) return { patterns: cmake, tool: 'cmake' };

  return null;
}

async function readPnpmWorkspace(projectRoot: string): Promise<string[] | null> {
  const file = join(projectRoot, 'pnpm-workspace.yaml');
  if (!(await fileExists(file))) return null;
  const content = await readFile(file, 'utf-8');
  return parsePnpmWorkspacePackages(content);
}

export function parsePnpmWorkspacePackages(yaml: string): string[] {
  const lines = yaml.split(/\r?\n/);
  const patterns: string[] = [];
  let inPackages = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '');
    if (/^\s*packages\s*:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const match = line.match(/^\s*-\s*["']?([^"'\s]+)["']?\s*$/);
      if (match) {
        patterns.push(match[1]);
      } else if (/^\S/.test(line)) {
        inPackages = false;
      }
    }
  }

  return patterns;
}

async function readLernaPackages(projectRoot: string): Promise<string[] | null> {
  const file = join(projectRoot, 'lerna.json');
  if (!(await fileExists(file))) return null;
  try {
    const parsed = JSON.parse(await readFile(file, 'utf-8')) as { packages?: string[] };
    return parsed.packages ?? null;
  } catch {
    return null;
  }
}

function inferNpmOrYarn(_projectRoot: string): MonorepoTool {
  return 'npm';
}

function isUnsafePattern(pattern: string): boolean {
  if (pattern.length === 0) return true;
  if (pattern.startsWith('/')) return true;
  if (/^[A-Za-z]:/.test(pattern)) return true;
  if (pattern.includes('\\')) return true;
  return pattern.split('/').some((seg) => seg === '..');
}

export async function expandWorkspacePatterns(root: string, patterns: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const pattern of patterns) {
    const trimmed = pattern.replace(/^\.\//, '').replace(/\/$/, '');
    if (isUnsafePattern(trimmed)) continue;
    if (trimmed.endsWith('/*')) {
      const parent = trimmed.slice(0, -2);
      results.push(...await listSubdirs(root, parent));
    } else if (!trimmed.includes('*')) {
      if (await isDirectory(join(root, trimmed))) results.push(trimmed);
    }
  }
  return dedupe(results);
}

async function listSubdirs(root: string, relativeParent: string): Promise<string[]> {
  const parentPath = join(root, relativeParent);
  if (!(await isDirectory(parentPath))) return [];
  const entries = await readdir(parentPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => `${relativeParent}/${entry.name}`);
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}
