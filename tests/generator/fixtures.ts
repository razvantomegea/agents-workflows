import type { StackConfig } from '../../src/schema/stack-config.js';
import { supportsReactTsStack } from '../../src/constants/frameworks.js';

export function makeStackConfig(overrides: Partial<StackConfig> = {}): StackConfig {
  const baseConfig: StackConfig = {
    project: { name: 'test-app', description: 'A test app', locale: 'en', localeRules: [], docsFile: null },
    stack: { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: 'tailwind', stateManagement: 'zustand', database: 'prisma', auth: null },
    tooling: { packageManager: 'pnpm', packageManagerPrefix: 'pnpm', testFramework: 'jest', testLibrary: 'react-testing-library', e2eFramework: 'playwright', linter: 'eslint', formatter: 'prettier' },
    paths: { sourceRoot: 'src/', componentsDir: 'src/components/', hooksDir: 'src/hooks/', utilsDir: 'src/utils/', testsDir: 'tests/', designTokensFile: null, i18nDir: null, testConfigFile: null },
    commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: 'pnpm lint', format: null, build: null, dev: null },
    conventions: { componentStyle: 'arrow', propsStyle: 'readonly', maxFileLength: 200, testColocation: true, barrelExports: true, strictTypes: true },
    agents: { architect: true, implementer: true, reactTsSenior: true, codeReviewer: true, securityReviewer: true, codeOptimizer: true, testWriter: true, e2eTester: true, reviewer: true, uiDesigner: true },
    selectedCommands: { workflowPlan: true, workflowFix: true, externalReview: true },
    targets: { claudeCode: true, codexCli: true },
    detectedAiAgents: { claudeCode: false, codexCli: false, cursor: false, aider: false, continueDev: false, copilot: false, windsurf: false, gemini: false },
    monorepo: null,
    ...overrides,
  };
  const agents = overrides.agents ?? baseConfig.agents;

  return {
    ...baseConfig,
    agents: {
      ...agents,
      reactTsSenior: overrides.agents?.reactTsSenior
        ?? supportsReactTsStack(baseConfig.stack.framework, baseConfig.stack.language),
    },
  };
}
