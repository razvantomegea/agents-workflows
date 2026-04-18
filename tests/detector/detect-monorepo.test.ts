import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectMonorepo,
  expandWorkspacePatterns,
  parsePnpmWorkspacePackages,
} from '../../src/detector/detect-monorepo.js';

describe('parsePnpmWorkspacePackages', () => {
  it('parses quoted and unquoted entries', () => {
    const yaml = `packages:\n  - "mobile"\n  - ingestion\n`;
    expect(parsePnpmWorkspacePackages(yaml)).toEqual(['mobile', 'ingestion']);
  });

  it('ignores comments and non-packages sections', () => {
    const yaml = `# root config\npackages:\n  - apps/*\n  - packages/*\n\nonlyBuiltDependencies:\n  - esbuild\n`;
    expect(parsePnpmWorkspacePackages(yaml)).toEqual(['apps/*', 'packages/*']);
  });

  it('returns empty array when packages field is missing', () => {
    expect(parsePnpmWorkspacePackages('onlyBuiltDependencies:\n  - esbuild\n')).toEqual([]);
  });
});

describe('expandWorkspacePatterns', () => {
  const created: string[] = [];

  afterEach(async () => {
    while (created.length) {
      const path = created.pop();
      if (path) await rm(path, { recursive: true, force: true });
    }
  });

  async function makeRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'agents-workflows-monorepo-'));
    created.push(root);
    return root;
  }

  it('expands glob entries like packages/* to child directories', async () => {
    const root = await makeRoot();
    await mkdir(join(root, 'packages', 'a'), { recursive: true });
    await mkdir(join(root, 'packages', 'b'), { recursive: true });

    const result = await expandWorkspacePatterns(root, ['packages/*']);
    expect(result.sort()).toEqual(['packages/a', 'packages/b']);
  });

  it('keeps literal entries when they exist as directories', async () => {
    const root = await makeRoot();
    await mkdir(join(root, 'mobile'));
    const result = await expandWorkspacePatterns(root, ['mobile', 'missing']);
    expect(result).toEqual(['mobile']);
  });
});

describe('detectMonorepo', () => {
  const created: string[] = [];

  afterEach(async () => {
    while (created.length) {
      const path = created.pop();
      if (path) await rm(path, { recursive: true, force: true });
    }
  });

  async function makeRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'agents-workflows-monorepo-'));
    created.push(root);
    return root;
  }

  it('detects pnpm workspace from pnpm-workspace.yaml', async () => {
    const root = await makeRoot();
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - mobile\n  - ingestion\n', 'utf-8');
    await mkdir(join(root, 'mobile'));
    await mkdir(join(root, 'ingestion'));

    const result = await detectMonorepo(root);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('pnpm');
    expect(result.workspaces.sort()).toEqual(['ingestion', 'mobile']);
  });

  it('detects npm/yarn workspaces from package.json workspaces field', async () => {
    const root = await makeRoot();
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'root', workspaces: ['apps/*'] }), 'utf-8');
    await mkdir(join(root, 'apps', 'web'), { recursive: true });
    await mkdir(join(root, 'apps', 'api'), { recursive: true });

    const result = await detectMonorepo(root);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('npm');
    expect(result.workspaces.sort()).toEqual(['apps/api', 'apps/web']);
  });

  it('returns empty info for non-monorepo projects', async () => {
    const root = await makeRoot();
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'single' }), 'utf-8');
    const result = await detectMonorepo(root);
    expect(result).toEqual({ isMonorepo: false, tool: null, workspaces: [] });
  });
});
