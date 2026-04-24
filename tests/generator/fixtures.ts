import type { StackConfig } from '../../src/schema/stack-config.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { supportsReactTsStack } from '../../src/constants/frameworks.js';

export function findFile(files: GeneratedFile[], filePath: string): GeneratedFile | undefined {
  return files.find((f) => f.path === filePath);
}

export function getContent(files: GeneratedFile[], filePath: string): string {
  const file = findFile(files, filePath);
  if (!file) throw new Error(`File not found: ${filePath}`);
  return file.content;
}

export function makeStackConfig(overrides: Partial<StackConfig> = {}): StackConfig {
  const baseStack: StackConfig['stack'] = { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: 'tailwind', stateManagement: 'zustand', database: 'prisma', auth: null, i18nLibrary: null };
  const baseTargets: StackConfig['targets'] = { claudeCode: true, codexCli: true };
  const baseSelectedCommands: StackConfig['selectedCommands'] = { workflowPlan: true, workflowFix: true, externalReview: true, workflowLonghorizon: false, workflowTcr: false };
  const baseGovernance: StackConfig['governance'] = { enabled: false };
  const baseAgents: StackConfig['agents'] = { architect: true, implementer: true, reactTsSenior: true, codeReviewer: true, securityReviewer: true, codeOptimizer: true, testWriter: true, e2eTester: true, reviewer: true, uiDesigner: true };

  const mergedStack: StackConfig['stack'] = { ...baseStack, ...overrides.stack };
  const mergedTargets: StackConfig['targets'] = { ...baseTargets, ...overrides.targets };
  const mergedSelectedCommands: StackConfig['selectedCommands'] = { ...baseSelectedCommands, ...overrides.selectedCommands };
  const mergedGovernance: StackConfig['governance'] = { ...baseGovernance, ...overrides.governance };
  const mergedAgents: StackConfig['agents'] = { ...baseAgents, ...overrides.agents };

  const baseConfig: StackConfig = {
    project: { name: 'test-app', description: 'A test app', locale: 'en', localeRules: [], docsFile: null, mainBranch: 'main', ...overrides.project },
    stack: mergedStack,
    tooling: { packageManager: 'pnpm', packageManagerPrefix: 'pnpm', testFramework: 'jest', testLibrary: 'react-testing-library', e2eFramework: 'playwright', linter: 'eslint', formatter: 'prettier', ...overrides.tooling },
    paths: { sourceRoot: 'src/', componentsDir: 'src/components/', hooksDir: 'src/hooks/', utilsDir: 'src/utils/', testsDir: 'tests/', designTokensFile: null, i18nDir: null, testConfigFile: null, ...overrides.paths },
    commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: 'pnpm lint', format: null, build: null, dev: null, ...overrides.commands },
    conventions: { componentStyle: 'arrow', propsStyle: 'readonly', maxFileLength: 200, testColocation: true, barrelExports: true, strictTypes: true, ...overrides.conventions },
    agents: mergedAgents,
    selectedCommands: mergedSelectedCommands,
    targets: mergedTargets,
    governance: mergedGovernance,
    detectedAiAgents: { claudeCode: false, codexCli: false, cursor: false, aider: false, continueDev: false, copilot: false, windsurf: false, gemini: false, ...overrides.detectedAiAgents },
    monorepo: overrides.monorepo !== undefined ? overrides.monorepo : null,
  };

  return {
    ...baseConfig,
    agents: {
      ...mergedAgents,
      reactTsSenior: overrides.agents?.reactTsSenior
        ?? supportsReactTsStack(mergedStack.framework, mergedStack.language),
    },
  };
}
