import { buildContext } from '../../src/generator/build-context.js';
import { makeStackConfig } from './fixtures.js';

const makeConfig = makeStackConfig;

describe('buildContext', () => {
  it('sets isReact true for Next.js', () => {
    const ctx = buildContext(makeConfig());
    expect(ctx.isReact).toBe(true);
    expect(ctx.isFrontend).toBe(true);
    expect(ctx.isMobile).toBe(false);
    expect(ctx.isTypescript).toBe(true);
  });

  it('sets isMobile true for Expo', () => {
    const ctx = buildContext(makeConfig({
      stack: { language: 'typescript', runtime: 'react-native', framework: 'expo', uiLibrary: 'tamagui', stateManagement: 'zustand', database: 'supabase', auth: null },
    }));
    expect(ctx.isMobile).toBe(true);
    expect(ctx.isReact).toBe(true);
  });

  it('sets isReact false for Python', () => {
    const ctx = buildContext(makeConfig({
      stack: { language: 'python', runtime: 'python', framework: 'fastapi', uiLibrary: null, stateManagement: null, database: 'sqlalchemy', auth: null },
    }));
    expect(ctx.isReact).toBe(false);
    expect(ctx.isFrontend).toBe(false);
    expect(ctx.isTypescript).toBe(false);
  });

  it('handles null framework without including a framework item in stackItems', () => {
    const ctx = buildContext(makeConfig({
      stack: { language: 'typescript', runtime: 'node', framework: null, uiLibrary: null, stateManagement: null, database: null, auth: null },
    }));
    expect(ctx.isReact).toBe(false);
    expect(ctx.isFrontend).toBe(false);
    expect(ctx.isMobile).toBe(false);
    expect(ctx.stackItems).not.toContain('Null');
    expect(ctx.stackItems).toContain('Typescript (node)');
  });

  it('gates hasReactTsSenior by React and TypeScript stack support', () => {
    const baseConfig = makeConfig();
    const ctx = buildContext({
      ...baseConfig,
      stack: {
        language: 'python',
        runtime: 'python',
        framework: 'fastapi',
        uiLibrary: null,
        stateManagement: null,
        database: null,
        auth: null,
      },
      agents: { ...baseConfig.agents, reactTsSenior: true },
    });

    expect(ctx.hasReactTsSenior).toBe(false);
  });

  it('builds stack items list', () => {
    const ctx = buildContext(makeConfig());
    expect(ctx.stackItems).toContain('Typescript (node)');
    expect(ctx.stackItems).toContain('Nextjs');
    expect(ctx.stackItems).toContain('Tailwind');
    expect(ctx.stackItems).toContain('Zustand');
    expect(ctx.stackItems).toContain('Prisma');
  });

  it('builds review checklist with TypeScript and React rules', () => {
    const ctx = buildContext(makeConfig());
    const ruleNames = ctx.reviewChecklist.map((r) => r.name);
    expect(ruleNames).toContain('No `any`');
    expect(ruleNames).toContain('DRY');
    expect(ruleNames).toContain('useCallback');
    expect(ruleNames).toContain('useMemo');
  });

  it('excludes React rules for non-React projects', () => {
    const ctx = buildContext(makeConfig({
      stack: { language: 'python', runtime: 'python', framework: 'fastapi', uiLibrary: null, stateManagement: null, database: null, auth: null },
    }));
    const ruleNames = ctx.reviewChecklist.map((r) => r.name);
    expect(ruleNames).not.toContain('useCallback');
    expect(ruleNames).not.toContain('useMemo');
    expect(ruleNames).not.toContain('No `any`');
    expect(ruleNames).toContain('DRY');
  });

  it('propagates docsFile from project config onto the context', () => {
    const withDocs = buildContext(makeConfig({
      project: { name: 'x', description: 'x', locale: 'en', localeRules: [], docsFile: 'PRD.md', mainBranch: 'main' },
    }));
    expect(withDocs.docsFile).toBe('PRD.md');

    const withoutDocs = buildContext(makeConfig());
    expect(withoutDocs.docsFile).toBeNull();
  });

  it('propagates mainBranch from project config onto the context', () => {
    const ctx = buildContext(makeConfig({
      project: {
        name: 'x',
        description: 'x',
        locale: 'en',
        localeRules: [],
        docsFile: null,
        mainBranch: 'trunk',
      },
    }));

    expect(ctx.mainBranch).toBe('trunk');
  });

  it('passes detectedAiAgents through unchanged', () => {
    const ctx = buildContext(makeConfig({
      detectedAiAgents: {
        claudeCode: true,
        codexCli: false,
        cursor: true,
        aider: false,
        continueDev: false,
        copilot: false,
        windsurf: false,
        gemini: false,
      },
    }));

    expect(ctx.detectedAiAgents.claudeCode).toBe(true);
    expect(ctx.detectedAiAgents.cursor).toBe(true);
    expect(ctx.detectedAiAgents.codexCli).toBe(false);
    expect(ctx.detectedAiAgents.gemini).toBe(false);
  });
});
