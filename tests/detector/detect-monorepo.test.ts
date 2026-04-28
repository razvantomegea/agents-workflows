import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectMonorepo,
  expandWorkspacePatterns,
  parsePnpmWorkspacePackages,
} from '../../src/detector/detect-monorepo.js';

// Structural deviation note: the six new fixtures carry root manifests PLUS nested workspace
// dirs with their own manifests — unlike the single-manifest convention in nextjs-app/,
// python-fastapi/, react-native-expo/. This is justified because each fixture exercises a
// distinct monorepo tool's workspace-resolution format (Cargo, go.work, uv, .sln, CMake,
// pnpm hybrid).
const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(CURRENT_DIR, '..', 'fixtures');

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

  it('prefers pnpm-workspace.yaml over package.json workspaces when both exist', async () => {
    const root = await makeRoot();
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'root', workspaces: ['packages/*'] }),
      'utf-8',
    );
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n', 'utf-8');
    await mkdir(join(root, 'packages', 'ui'), { recursive: true });
    await mkdir(join(root, 'apps', 'web'), { recursive: true });

    const result = await detectMonorepo(root);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('pnpm');
    expect(result.workspaces).toEqual(['apps/web']);
  });

  it('returns empty info for non-monorepo projects', async () => {
    const root = await makeRoot();
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'single' }), 'utf-8');
    const result = await detectMonorepo(root);
    expect(result).toEqual({ isMonorepo: false, tool: null, workspaces: [] });
  });

  it('detects Cargo workspace from Cargo.toml members field', async () => {
    const fixtureRoot = join(FIXTURES_DIR, 'monorepo-cargo');
    const result = await detectMonorepo(fixtureRoot);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('cargo');
    expect(result.workspaces).toEqual(['crates/foo']);
  });

  it('detects go.work workspace from use block', async () => {
    const fixtureRoot = join(FIXTURES_DIR, 'monorepo-go-work');
    const result = await detectMonorepo(fixtureRoot);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('go-work');
    expect(result.workspaces).toEqual(['svc']);
  });

  it('detects uv workspace from [tool.uv.workspace] members', async () => {
    const fixtureRoot = join(FIXTURES_DIR, 'monorepo-uv');
    const result = await detectMonorepo(fixtureRoot);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('uv');
    expect(result.workspaces).toEqual(['packages/foo']);
  });

  it('detects dotnet solution from .sln Project entries', async () => {
    const fixtureRoot = join(FIXTURES_DIR, 'monorepo-dotnet-sln');
    const result = await detectMonorepo(fixtureRoot);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('dotnet-sln');
    expect(result.workspaces).toEqual(['Foo']);
  });

  it('detects CMake subdirectories from add_subdirectory calls', async () => {
    const fixtureRoot = join(FIXTURES_DIR, 'monorepo-cmake');
    const result = await detectMonorepo(fixtureRoot);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('cmake');
    expect(result.workspaces).toEqual(['foo']);
  });

  it('hybrid pnpm+python+rust: resolves every workspace listed in pnpm-workspace.yaml', async () => {
    const fixtureRoot = join(FIXTURES_DIR, 'monorepo-hybrid-pnpm-python-rust');
    const result = await detectMonorepo(fixtureRoot);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('pnpm');
    expect(result.workspaces.sort()).toEqual(['apps/web', 'crates/core', 'services/api']);
  });

  it('honors Poetry packages with a from prefix', async () => {
    const root = await makeRoot();
    await writeFile(
      join(root, 'pyproject.toml'),
      '[tool.poetry]\npackages = [{ include = "api", from = "services" }]\n',
      'utf-8',
    );
    await mkdir(join(root, 'services', 'api'), { recursive: true });

    const result = await detectMonorepo(root);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('poetry');
    expect(result.workspaces).toEqual(['services/api']);
  });

  it('honors multiline Poetry package entries with from prefixes', async () => {
    const root = await makeRoot();
    await writeFile(
      join(root, 'pyproject.toml'),
      '[tool.poetry]\npackages = [\n  { include = "api",\n    from = "services" },\n]\n',
      'utf-8',
    );
    await mkdir(join(root, 'services', 'api'), { recursive: true });

    const result = await detectMonorepo(root);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe('poetry');
    expect(result.workspaces).toEqual(['services/api']);
  });
});
