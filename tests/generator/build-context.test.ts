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

  it('passes implementerVariant through onto the context', () => {
    const baseConfig = makeConfig();
    const ctx = buildContext({
      ...baseConfig,
      agents: { ...baseConfig.agents, implementerVariant: 'python' },
    });

    expect(ctx.implementerVariant).toBe('python');
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
      project: { name: 'x', description: 'x', locale: 'en', localeRules: [], docsFile: 'PRD.md', roadmapFile: null, mainBranch: 'main' },
    }));
    expect(withDocs.docsFile).toBe('PRD.md');

    const withoutDocs = buildContext(makeConfig());
    expect(withoutDocs.docsFile).toBeNull();
  });

  it('propagates roadmapFile from project config onto the context independently of docsFile', () => {
    const withRoadmap = buildContext(makeConfig({
      project: { name: 'x', description: 'x', locale: 'en', localeRules: [], docsFile: 'README.md', roadmapFile: 'PRD.md', mainBranch: 'main' },
    }));
    expect(withRoadmap.docsFile).toBe('README.md');
    expect(withRoadmap.roadmapFile).toBe('PRD.md');

    const withoutRoadmap = buildContext(makeConfig());
    expect(withoutRoadmap.roadmapFile).toBeNull();
  });

  it('propagates mainBranch from project config onto the context', () => {
    const ctx = buildContext(makeConfig({
      project: {
        name: 'x',
        description: 'x',
        locale: 'en',
        localeRules: [],
        docsFile: null,
        roadmapFile: null,
        mainBranch: 'trunk',
      },
    }));

    expect(ctx.mainBranch).toBe('trunk');
  });

  it('sets hasI18n false when i18nLibrary is null', () => {
    const ctx = buildContext(makeConfig());
    expect(ctx.hasI18n).toBe(false);
    expect(ctx.i18nLibrary).toBeNull();
  });

  it('sets hasI18n true and surfaces i18nLibrary when set', () => {
    const base = makeConfig();
    const ctx = buildContext({
      ...base,
      stack: { ...base.stack, i18nLibrary: 'i18next' },
    });
    expect(ctx.hasI18n).toBe(true);
    expect(ctx.i18nLibrary).toBe('i18next');
  });

  it('sets isPolyglot false when languages array is empty', () => {
    const ctx = buildContext(makeConfig({ languages: [] }));
    expect(ctx.isPolyglot).toBe(false);
  });

  it('sets isPolyglot false when only one language is present', () => {
    const ctx = buildContext(makeConfig({ languages: ['typescript'] }));
    expect(ctx.isPolyglot).toBe(false);
  });

  it('sets isPolyglot true when two or more languages are present', () => {
    const ctx = buildContext(makeConfig({ languages: ['typescript', 'python'] }));
    expect(ctx.isPolyglot).toBe(true);
  });

  it('does not count duplicate or case-variant languages as polyglot', () => {
    const ctx = buildContext(makeConfig({ languages: ['TypeScript', 'typescript', ' typescript '] }));
    expect(ctx.isPolyglot).toBe(false);
  });

  it('ignores blank language entries when computing isPolyglot', () => {
    const ctx = buildContext(makeConfig({ languages: ['typescript', '  '] }));
    expect(ctx.isPolyglot).toBe(false);
  });

  it('passes languages through onto the context', () => {
    const ctx = buildContext(makeConfig({ languages: ['typescript', 'rust', 'go'] }));
    expect(ctx.languages).toEqual(['typescript', 'rust', 'go']);
  });

  it('copies languages onto the context instead of aliasing config.languages', () => {
    const config = makeConfig({ languages: ['typescript', 'python'] });
    const ctx = buildContext(config);
    config.languages.push('rust');
    expect(ctx.languages).toEqual(['typescript', 'python']);
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
