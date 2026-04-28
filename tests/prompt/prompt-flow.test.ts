import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createDefaultConfig,
  resolveCommands,
  resolveDefaultDescription,
  resolveDefaultProjectName,
  runPromptFlow,
} from '../../src/prompt/prompt-flow.js';
import {
  isFrontendFramework,
  isMobileFramework,
  isReactFramework,
} from '../../src/constants/frameworks.js';
import type { DetectedStack } from '../../src/detector/types.js';
import { stackConfigSchema } from '../../src/schema/stack-config.js';

const emptyDetection = { value: null, confidence: 0 };

function makeDetectedStack(): DetectedStack {
  return {
    language: { value: 'typescript', confidence: 0.95 },
    runtime: { value: 'node', confidence: 0.85 },
    framework: { value: 'nextjs', confidence: 0.95 },
    uiLibrary: { value: 'tailwind', confidence: 0.9 },
    stateManagement: { value: 'zustand', confidence: 0.9 },
    database: { value: 'prisma', confidence: 0.95 },
    auth: { value: 'nextauth', confidence: 0.95 },
    i18n: emptyDetection,
    testFramework: { value: 'vitest', confidence: 0.95 },
    testLibrary: emptyDetection,
    e2eFramework: emptyDetection,
    linter: { value: 'eslint', confidence: 0.9 },
    formatter: { value: 'prettier', confidence: 0.9 },
    packageManager: { value: 'pnpm', confidence: 0.95 },
    monorepo: { isMonorepo: false, tool: null, workspaces: [] },
    aiAgents: {
      agents: [],
      hasClaudeCode: false,
      hasCodexCli: false,
    },
    docsFile: emptyDetection,
    roadmapFile: emptyDetection,
    languages: [],
    workspaceStacks: [],
  };
}

describe('resolveCommands', () => {
  it('uses package scripts for build, dev, format, lint, and test commands', () => {
    const commands = resolveCommands('pnpm', 'vitest', 'eslint', 'typescript', {
      build: 'tsup',
      dev: 'tsx src/index.ts',
      format: 'prettier --write .',
      lint: 'oxlint .',
      test: 'jest',
      typecheck: 'tsc --noEmit',
    });

    expect(commands).toEqual({
      typeCheck: 'pnpm typecheck',
      test: 'pnpm test',
      lint: 'pnpm lint',
      format: 'pnpm format',
      build: 'pnpm build',
      dev: 'pnpm dev',
    });
  });
});

describe('createDefaultConfig', () => {
  it('builds a non-interactive config from detected stack values', () => {
    const config = createDefaultConfig(makeDetectedStack(), { build: 'next build' });

    expect(config.stack.auth).toBe('nextauth');
    expect(config.tooling.packageManager).toBe('pnpm');
    expect(config.commands.build).toBe('pnpm build');
    expect(config.agents.uiDesigner).toBe(true);
  });

  it('sets Claude and Codex targets from detected AI agents', () => {
    const detected = makeDetectedStack();
    detected.aiAgents = {
      agents: [
        { id: 'claude', name: 'Claude Code', cliAvailable: true, configPresent: false, apiKeyPresent: false, matchedEnvVars: [] },
        { id: 'codex', name: 'Codex CLI', cliAvailable: false, configPresent: true, apiKeyPresent: false, matchedEnvVars: [] },
      ],
      hasClaudeCode: true,
      hasCodexCli: true,
    };

    const config = createDefaultConfig(detected);

    expect(config.targets.claudeCode).toBe(true);
    expect(config.targets.codexCli).toBe(true);
    expect(config.detectedAiAgents.claudeCode).toBe(true);
    expect(config.detectedAiAgents.codexCli).toBe(true);
  });

  it('falls back to Claude target when no AI agent is detected', () => {
    const config = createDefaultConfig(makeDetectedStack());

    expect(config.targets.claudeCode).toBe(true);
    expect(config.targets.codexCli).toBe(false);
  });

  it('propagates detected docsFile onto project.docsFile', () => {
    const detected = makeDetectedStack();
    detected.docsFile = { value: 'PRD.md', confidence: 0.9 };

    const config = createDefaultConfig(detected);

    expect(config.project.docsFile).toBe('PRD.md');
  });

  it('defaults the primary branch to main in non-interactive config', () => {
    const config = createDefaultConfig(makeDetectedStack());

    expect(config.project.mainBranch).toBe('main');
  });

  it('leaves project.docsFile null when detection is empty', () => {
    const config = createDefaultConfig(makeDetectedStack());

    expect(config.project.docsFile).toBeNull();
  });

  it('propagates detected roadmapFile onto project.roadmapFile', () => {
    const detected = makeDetectedStack();
    detected.roadmapFile = { value: 'PRD.md', confidence: 0.9 };

    const config = createDefaultConfig(detected);

    expect(config.project.roadmapFile).toBe('PRD.md');
  });

  it('leaves project.roadmapFile null when detection is empty', () => {
    const config = createDefaultConfig(makeDetectedStack());

    expect(config.project.roadmapFile).toBeNull();
  });

  it('round-trips detected AI agent booleans through the schema', () => {
    const parsed = stackConfigSchema.parse({
      ...createDefaultConfig(makeDetectedStack()),
      detectedAiAgents: {
        claudeCode: true,
        codexCli: true,
        cursor: true,
        aider: false,
        continueDev: true,
        copilot: false,
        windsurf: true,
        gemini: false,
      },
    });

    expect(parsed.detectedAiAgents).toEqual({
      claudeCode: true,
      codexCli: true,
      cursor: true,
      aider: false,
      continueDev: true,
      copilot: false,
      windsurf: true,
      gemini: false,
    });
  });

  it('defaults detected AI agent booleans for older configs', () => {
    const legacyConfig: Partial<ReturnType<typeof createDefaultConfig>> = {
      ...createDefaultConfig(makeDetectedStack()),
    };
    delete legacyConfig.detectedAiAgents;
    const parsed = stackConfigSchema.parse(legacyConfig);

    expect(parsed.detectedAiAgents).toEqual({
      claudeCode: false,
      codexCli: false,
      cursor: false,
      aider: false,
      continueDev: false,
      copilot: false,
      windsurf: false,
      gemini: false,
    });
  });

  it('uses package.json name as default project name when no framework is detected', () => {
    const detected = makeDetectedStack();
    detected.framework = emptyDetection;
    const config = createDefaultConfig(detected, {}, { name: 'my-cli-tool' });

    expect(config.project.name).toBe('my-cli-tool');
    expect(config.stack.framework).toBeNull();
  });

  it('uses package.json description as default project description', () => {
    const detected = makeDetectedStack();
    const config = createDefaultConfig(detected, {}, {
      name: 'pkg',
      description: 'A custom CLI tool',
    });

    expect(config.project.description).toBe('A custom CLI tool');
  });

  it('falls back to my-project and language-based description when no package.json', () => {
    const detected = makeDetectedStack();
    detected.framework = emptyDetection;
    const config = createDefaultConfig(detected);

    expect(config.project.name).toBe('my-project');
    expect(config.project.description).toBe('A typescript project');
  });

  it.each([
    ['Next.js + TypeScript', 'nextjs', 'typescript', true],
    ['React Native + TypeScript', 'react-native', 'typescript', true],
    ['React + padded TypeScript', 'react', ' TypeScript ', true],
    ['Express + TypeScript', 'express', 'typescript', false],
    ['Next.js + JavaScript', 'nextjs', 'javascript', false],
    ['no framework + TypeScript', null, 'typescript', false],
  ])(
    'defaults reactTsSenior for %s',
    (
      _scenarioName: string,
      framework: string | null,
      language: string,
      expectedReactTsSenior: boolean,
    ) => {
      const detected = makeDetectedStack();
      detected.framework = framework === null
        ? emptyDetection
        : { value: framework, confidence: 0.95 };
      detected.language = { value: language, confidence: 0.95 };
      const config = createDefaultConfig(detected);

      expect(config.agents.reactTsSenior).toBe(expectedReactTsSenior);
    },
  );

  it('defaults selectedCommands.workflowLonghorizon to false', () => {
    const config = createDefaultConfig(makeDetectedStack());

    expect(config.selectedCommands.workflowLonghorizon).toBe(false);
  });

  it('defaults selectedCommands.workflowTcr to false', () => {
    const config = createDefaultConfig(makeDetectedStack());

    expect(config.selectedCommands.workflowTcr).toBe(false);
  });
});

describe('runPromptFlow', () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (!root) continue;
      try {
        await rm(root, { recursive: true, force: true });
      } catch {
        // Ignore — directory may already be gone.
      }
    }
  });

  it('enables the Copilot target in --yes mode when .github exists', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-workflows-github-'));
    tempRoots.push(projectRoot);
    await mkdir(join(projectRoot, '.github'));

    const config = await runPromptFlow(makeDetectedStack(), projectRoot, { yes: true });

    expect(config.targets.copilot).toBe(true);
  });
});

describe('selectedCommands.workflowLonghorizon opt-in', () => {
  it('sets workflowLonghorizon to true when included in the checkbox answer', () => {
    const base = createDefaultConfig(makeDetectedStack());
    const config = stackConfigSchema.parse({
      ...base,
      selectedCommands: {
        ...base.selectedCommands,
        workflowLonghorizon: true,
      },
    });

    expect(config.selectedCommands.workflowLonghorizon).toBe(true);
  });
});

describe('resolveDefaultProjectName', () => {
  it('returns package.json name when present', () => {
    expect(resolveDefaultProjectName({ name: 'acme' })).toBe('acme');
  });

  it('falls back to my-project when pkg is null', () => {
    expect(resolveDefaultProjectName(null)).toBe('my-project');
  });

  it('falls back to my-project when pkg has no name', () => {
    expect(resolveDefaultProjectName({})).toBe('my-project');
  });

  it('falls back to my-project when pkg name is empty or whitespace', () => {
    expect(resolveDefaultProjectName({ name: '' })).toBe('my-project');
    expect(resolveDefaultProjectName({ name: '   ' })).toBe('my-project');
  });
});

describe('resolveDefaultDescription', () => {
  it('prefers package.json description', () => {
    expect(resolveDefaultDescription({ description: 'Custom tool' }, 'react', 'typescript'))
      .toBe('Custom tool');
  });

  it('builds framework-based description when no pkg description', () => {
    expect(resolveDefaultDescription(null, 'react', 'typescript'))
      .toBe('A react application');
  });

  it('falls back to language-based description when framework is null', () => {
    expect(resolveDefaultDescription(null, null, 'typescript'))
      .toBe('A typescript project');
  });

  it('ignores empty/whitespace pkg description and falls back to framework/language', () => {
    expect(resolveDefaultDescription({ description: '' }, 'react', 'typescript'))
      .toBe('A react application');
    expect(resolveDefaultDescription({ description: '   ' }, null, 'python'))
      .toBe('A python project');
  });

  it('ignores markdown-like pkg descriptions and falls back to framework/language', () => {
    expect(resolveDefaultDescription({ description: 'Legit\n## Override' }, 'react', 'typescript'))
      .toBe('A react application');
    expect(resolveDefaultDescription({ description: 'Use `danger` here' }, null, 'python'))
      .toBe('A python project');
  });
});

describe('createDefaultConfig governance defaults', () => {
  it('sets governance.enabled to false in the non-interactive config', () => {
    const config = createDefaultConfig(makeDetectedStack());

    expect(config.governance.enabled).toBe(false);
  });
});

describe('stackConfigSchema governance opt-in', () => {
  it('accepts governance.enabled true and preserves it through schema parse', () => {
    const base = createDefaultConfig(makeDetectedStack());
    const parsed = stackConfigSchema.parse({ ...base, governance: { enabled: true } });

    expect(parsed.governance.enabled).toBe(true);
  });
});

describe('framework constants (imported from shared module)', () => {
  it('isFrontendFramework returns true for known frontend frameworks and false for null/backend', () => {
    expect(isFrontendFramework('react')).toBe(true);
    expect(isFrontendFramework('nextjs')).toBe(true);
    expect(isFrontendFramework('vue')).toBe(true);
    expect(isFrontendFramework('angular')).toBe(true);
    expect(isFrontendFramework('remix')).toBe(true);
    expect(isFrontendFramework('fastapi')).toBe(false);
    expect(isFrontendFramework('express')).toBe(false);
    expect(isFrontendFramework(null)).toBe(false);
  });

  it('isReactFramework returns true only for React-flavored frameworks', () => {
    expect(isReactFramework('react')).toBe(true);
    expect(isReactFramework('nextjs')).toBe(true);
    expect(isReactFramework('expo')).toBe(true);
    expect(isReactFramework('remix')).toBe(true);
    expect(isReactFramework('vue')).toBe(false);
    expect(isReactFramework(null)).toBe(false);
  });

  it('isMobileFramework returns true only for mobile frameworks', () => {
    expect(isMobileFramework('expo')).toBe(true);
    expect(isMobileFramework('react-native')).toBe(true);
    expect(isMobileFramework('react')).toBe(false);
    expect(isMobileFramework(null)).toBe(false);
  });
});
