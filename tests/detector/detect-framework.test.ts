import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectFramework } from '../../src/detector/detect-framework.js';

const writePackageJson = async (
  projectRoot: string,
  deps: Record<string, string>,
): Promise<void> => {
  const pkg = { name: 'test-project', dependencies: deps };
  await writeFile(join(projectRoot, 'package.json'), JSON.stringify(pkg), 'utf-8');
};

const writePyprojectToml = async (
  projectRoot: string,
  dependency: string,
): Promise<void> => {
  const content = `[project]\nname = "test-project"\ndependencies = ["${dependency}>=1.0"]\n`;
  await writeFile(join(projectRoot, 'pyproject.toml'), content, 'utf-8');
};

describe('detectFramework', () => {
  let projectRoot: string | null = null;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'agents-fw-'));
  });

  afterEach(async () => {
    if (projectRoot !== null) {
      await rm(projectRoot, { recursive: true, force: true });
      projectRoot = null;
    }
  });

  it('detects express from package.json dependencies', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await writePackageJson(projectRoot, { express: '^4.18.0' });
    await expect(detectFramework(projectRoot)).resolves.toMatchObject({ value: 'express' });
  });

  it('detects fastify from package.json dependencies', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await writePackageJson(projectRoot, { fastify: '^4.0.0' });
    await expect(detectFramework(projectRoot)).resolves.toMatchObject({ value: 'fastify' });
  });

  it('detects hono from package.json dependencies', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await writePackageJson(projectRoot, { hono: '^3.0.0' });
    await expect(detectFramework(projectRoot)).resolves.toMatchObject({ value: 'hono' });
  });

  it('detects nestjs from @nestjs/core in package.json dependencies', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await writePackageJson(projectRoot, { '@nestjs/core': '^10.0.0' });
    await expect(detectFramework(projectRoot)).resolves.toMatchObject({ value: 'nestjs' });
  });

  it('prefers nestjs over express when both dependencies are present', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await writePackageJson(projectRoot, {
      express: '^4.18.0',
      '@nestjs/core': '^10.0.0',
    });
    await expect(detectFramework(projectRoot)).resolves.toMatchObject({ value: 'nestjs' });
  });

  it('detects fastapi from pyproject.toml project.dependencies', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await writePyprojectToml(projectRoot, 'fastapi');
    await expect(detectFramework(projectRoot)).resolves.toMatchObject({ value: 'fastapi' });
  });

  it('detects django from pyproject.toml project.dependencies', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await writePyprojectToml(projectRoot, 'django');
    await expect(detectFramework(projectRoot)).resolves.toMatchObject({ value: 'django' });
  });

  it('detects flask from pyproject.toml project.dependencies', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await writePyprojectToml(projectRoot, 'flask');
    await expect(detectFramework(projectRoot)).resolves.toMatchObject({ value: 'flask' });
  });

  it('returns null value when no known framework is found', async () => {
    if (projectRoot === null) throw new Error('projectRoot must be initialized in beforeEach');
    await expect(detectFramework(projectRoot)).resolves.toEqual({ value: null, confidence: 0 });
  });
});
