import { describe, it, expect } from '@jest/globals';
import {
  detectFixture,
  generateForFixture,
  getImplementerContent,
  IMPLEMENTER_CLAUDE_PATH,
  IMPLEMENTER_CODEX_PATH,
  UI_DESIGNER_CLAUDE_PATH,
} from './stack-aware-helpers/index.js';
import { getApplicableImplementerVariant } from '../../src/generator/implementer-routing.js';
import { makeDetectedStack } from './fixtures.js';
import type { ImplementerVariant } from '../../src/schema/stack-config.js';

// (a) Variant routing

describe('(a) variant routing', () => {
  it.each<[string, ImplementerVariant]>([
    ['backend-python-fastapi', 'python'],
    ['backend-go', 'go'],
    ['backend-rust', 'rust'],
    ['backend-java-spring', 'java-spring'],
    ['backend-dotnet', 'dotnet-csharp'],
    ['frontend-vue', 'vue'],
    ['frontend-angular', 'angular'],
    ['frontend-svelte', 'svelte'],
    ['backend-node-nestjs', 'node-ts-backend'],
    ['nextjs-app', 'react-ts'],
  ])('fixture %s produces variant %s', async (fixture: string, expected: ImplementerVariant) => {
    const detected = await detectFixture(fixture);
    expect(getApplicableImplementerVariant(detected)).toBe(expected);
  });

  it('typescript with no framework -> typescript variant', () => {
    const d = makeDetectedStack({
      language: { value: 'typescript', confidence: 0.9 },
      framework: { value: null, confidence: 0 },
    });
    expect(getApplicableImplementerVariant(d)).toBe('typescript');
  });

  it('javascript with no framework -> javascript variant', () => {
    const d = makeDetectedStack({
      language: { value: 'javascript', confidence: 0.9 },
      framework: { value: null, confidence: 0 },
    });
    expect(getApplicableImplementerVariant(d)).toBe('javascript');
  });
});

// (b) createDefaultConfig wiring

describe('(b) createDefaultConfig wiring', () => {
  it.each<[string, ImplementerVariant]>([
    ['backend-python-fastapi', 'python'],
    ['backend-go', 'go'],
    ['backend-rust', 'rust'],
    ['backend-java-spring', 'java-spring'],
    ['backend-dotnet', 'dotnet-csharp'],
    ['frontend-vue', 'vue'],
    ['frontend-angular', 'angular'],
    ['frontend-svelte', 'svelte'],
    ['backend-node-nestjs', 'node-ts-backend'],
    ['nextjs-app', 'react-ts'],
  ])('fixture %s -> implementerVariant %s, no reactTsSenior', async (fixture: string, expected: ImplementerVariant) => {
    const detected = await detectFixture(fixture);
    const { createDefaultConfig } = await import('../../src/prompt/default-config.js');
    const config = createDefaultConfig(detected);
    expect(config.agents.implementerVariant).toBe(expected);
    expect('reactTsSenior' in config.agents).toBe(false);
  });
});

// (c) Filename invariant

describe('(c) filename invariant', () => {
  const FIXTURES = [
    'backend-python-fastapi', 'backend-go', 'backend-rust', 'backend-java-spring',
    'backend-dotnet', 'frontend-vue', 'frontend-angular', 'frontend-svelte',
    'backend-node-nestjs', 'nextjs-app',
  ];

  it.each(FIXTURES)('fixture %s: one implementer per target, zero senior files', async (fixture: string) => {
    const files = await generateForFixture(fixture);
    const paths = files.map((generatedFile) => generatedFile.path);
    expect(paths.filter((p) => p === IMPLEMENTER_CLAUDE_PATH)).toHaveLength(1);
    expect(paths.filter((p) => p === IMPLEMENTER_CODEX_PATH)).toHaveLength(1);
    expect(paths.filter((p) => p.endsWith('-senior.md') || p.includes('/react-ts-senior/'))).toHaveLength(0);
  });
});

// (d) Variant body content

describe('(d) variant body content', () => {
  it('python: async def, Pydantic, pytest', async () => {
    const c = await getImplementerContent('backend-python-fastapi');
    expect(c).toContain('async def');
    expect(c).toContain('Pydantic');
    expect(c).toContain('pytest');
  });

  it('rust: Result, ?, cargo test', async () => {
    const c = await getImplementerContent('backend-rust');
    expect(c).toContain('Result');
    expect(c).toContain('?');
    expect(c).toContain('cargo test');
  });

  it('go: context.Context, go test', async () => {
    const c = await getImplementerContent('backend-go');
    expect(c).toContain('context.Context');
    expect(c).toContain('go test');
  });

  it('java-spring: @RestController, JUnit', async () => {
    const c = await getImplementerContent('backend-java-spring');
    expect(c).toContain('@RestController');
    expect(c).toContain('JUnit');
  });

  it('dotnet-csharp: WebApplicationFactory, xUnit', async () => {
    const c = await getImplementerContent('backend-dotnet');
    expect(c).toContain('WebApplicationFactory');
    expect(c).toContain('xUnit');
  });

  it('react-ts: Readonly<, useCallback, useMemo, Component & Hook Details', async () => {
    const c = await getImplementerContent('nextjs-app');
    expect(c).toContain('Readonly<');
    expect(c).toContain('useCallback');
    expect(c).toContain('useMemo');
    expect(c).toContain('Component & Hook Details');
  });

  it.each(['frontend-vue', 'frontend-angular'])('%s: Epic-17 placeholder body', async (fixture: string) => {
    const c = await getImplementerContent(fixture);
    expect(c).toContain('Detailed body (citation-backed, top-5 anti-patterns) lands in Epic 17.');
  });

  it('svelte: runes, Vitest, @testing-library/svelte', async () => {
    const c = await getImplementerContent('frontend-svelte');
    expect(c).toContain('runes');
    expect(c).toContain('Vitest');
    expect(c).toContain('@testing-library/svelte');
  });

  it('node-ts-backend: DTO, supertest', async () => {
    const c = await getImplementerContent('backend-node-nestjs');
    expect(c).toContain('DTO');
    expect(c).toContain('supertest');
  });
});

// (e) ui-designer gating

describe('(e) ui-designer gating', () => {
  const BACKENDS = [
    'backend-python-fastapi', 'backend-go', 'backend-rust',
    'backend-java-spring', 'backend-dotnet', 'backend-node-nestjs',
  ];
  const FRONTENDS = ['frontend-vue', 'frontend-angular', 'frontend-svelte', 'nextjs-app'];

  it.each(BACKENDS)('backend %s excludes ui-designer.md', async (fixture: string) => {
    const files = await generateForFixture(fixture);
    expect(files.map((generatedFile) => generatedFile.path)).not.toContain(UI_DESIGNER_CLAUDE_PATH);
  });

  it.each(BACKENDS)('backend %s AGENTS.md: no ui-designer sub-agent row', async (fixture: string) => {
    const files = await generateForFixture(fixture);
    const agentsMd = files.find((generatedFile) => generatedFile.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.content).not.toContain('UI/UX design & review');
  });

  it.each(FRONTENDS)('frontend %s includes ui-designer.md', async (fixture: string) => {
    const files = await generateForFixture(fixture);
    expect(files.map((generatedFile) => generatedFile.path)).toContain(UI_DESIGNER_CLAUDE_PATH);
  });
});

// (f) Legacy manifest migration — covered in tests/schema/implementer-variants-migration.test.ts
// (g) Generic byte-identical — covered in tests/generator/generic-byte-identical.test.ts
