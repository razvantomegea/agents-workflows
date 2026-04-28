import type { StackConfig } from '../../src/schema/stack-config.js';
import { SECURITY_DEFAULTS } from '../../src/schema/stack-config.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import type { DetectedStack } from '../../src/detector/types.js';
import { supportsReactTsStack } from '../../src/constants/frameworks.js';

export const IMPLEMENTER_PATH = '.claude/agents/implementer.md';
export const UI_DESIGNER_PATH = '.claude/agents/ui-designer.md';
export const ARCHITECT_PATH = '.claude/agents/architect.md';
export const I18N_HEADING = '## Internationalization';
export const TCR_CLAUDE_PATH = '.claude/commands/workflow-tcr.md';
export const TCR_CODEX_PATH = '.codex/prompts/workflow-tcr.md';
export const COMPLIANCE_PATH = 'docs/COMPLIANCE.md';
export const OSCAL_PATH = 'docs/oscal/component-definition.json';

export function findFile(files: GeneratedFile[], filePath: string): GeneratedFile | undefined {
  return files.find((f: GeneratedFile) => f.path === filePath);
}

/**
 * Retrieve the content string of a generated file at the given path.
 *
 * @param files - Array of generated files to search
 * @param filePath - Path of the file to locate
 * @returns The located file's `content` string
 * @throws Error if no file with `filePath` exists (message: `File not found: <filePath>`)
 */
export function getContent(files: GeneratedFile[], filePath: string): string {
  const file = findFile(files, filePath);
  if (!file) throw new Error(`File not found: ${filePath}`);
  return file.content;
}

/**
 * Create a StackConfig by merging explicit default values with provided overrides.
 *
 * The function builds a complete configuration object from fixed base defaults for stack, targets,
 * selected commands, governance, agents, and other top-level sections, then applies any fields
 * present in `overrides` to those defaults. The returned config sets `agents.reactTsSenior` to the
 * explicit override when provided; otherwise it is inferred from the merged stack's framework and language.
 *
 * @param overrides - Partial configuration values to override the defaults
 * @returns The assembled StackConfig with defaults merged and override values applied
 */
const EMPTY_DETECTION = { value: null, confidence: 0 };

/**
 * Creates a minimal DetectedStack with sensible defaults for use in tests.
 * Override individual detection fields as needed.
 */
export function makeDetectedStack(overrides: Partial<DetectedStack> = {}): DetectedStack {
  return {
    language: { value: 'typescript', confidence: 0.9 },
    runtime: { value: 'node', confidence: 0.9 },
    framework: EMPTY_DETECTION,
    uiLibrary: EMPTY_DETECTION,
    stateManagement: EMPTY_DETECTION,
    database: EMPTY_DETECTION,
    auth: EMPTY_DETECTION,
    i18n: EMPTY_DETECTION,
    testFramework: { value: 'jest', confidence: 0.9 },
    testLibrary: EMPTY_DETECTION,
    e2eFramework: EMPTY_DETECTION,
    linter: EMPTY_DETECTION,
    formatter: EMPTY_DETECTION,
    packageManager: { value: 'pnpm', confidence: 0.9 },
    monorepo: { isMonorepo: false, tool: null, workspaces: [] },
    aiAgents: { agents: [], hasClaudeCode: false, hasCodexCli: false },
    docsFile: EMPTY_DETECTION,
    roadmapFile: EMPTY_DETECTION,
    ...overrides,
  };
}

export function makeStackConfig(overrides: Partial<StackConfig> = {}): StackConfig {
  const baseStack: StackConfig['stack'] = { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: 'tailwind', stateManagement: 'zustand', database: 'prisma', auth: null, i18nLibrary: null };
  const baseTargets: StackConfig['targets'] = { claudeCode: true, codexCli: true, cursor: false, copilot: false, windsurf: false };
  const baseSelectedCommands: StackConfig['selectedCommands'] = { workflowPlan: true, workflowFix: true, externalReview: true, workflowLonghorizon: false, workflowTcr: false };
  const baseGovernance: StackConfig['governance'] = { enabled: false };
  const baseAgents: StackConfig['agents'] = { architect: true, implementer: true, reactTsSenior: true, codeReviewer: true, securityReviewer: true, codeOptimizer: true, testWriter: true, e2eTester: true, reviewer: true, uiDesigner: true };

  const mergedStack: StackConfig['stack'] = { ...baseStack, ...overrides.stack };
  const mergedTargets: StackConfig['targets'] = { ...baseTargets, ...overrides.targets };
  const mergedSelectedCommands: StackConfig['selectedCommands'] = { ...baseSelectedCommands, ...overrides.selectedCommands };
  const mergedGovernance: StackConfig['governance'] = { ...baseGovernance, ...overrides.governance };
  const mergedAgents: StackConfig['agents'] = { ...baseAgents, ...overrides.agents };

  const baseConfig: StackConfig = {
    project: { name: 'test-app', description: 'A test app', locale: 'en', localeRules: [], docsFile: null, roadmapFile: null, mainBranch: 'main', ...overrides.project },
    stack: mergedStack,
    tooling: { packageManager: 'pnpm', packageManagerPrefix: 'pnpm', testFramework: 'jest', testLibrary: 'react-testing-library', e2eFramework: 'playwright', linter: 'eslint', formatter: 'prettier', ...overrides.tooling },
    paths: { sourceRoot: 'src/', componentsDir: 'src/components/', hooksDir: 'src/hooks/', utilsDir: 'src/utils/', testsDir: 'tests/', designTokensFile: null, i18nDir: null, testConfigFile: null, ...overrides.paths },
    commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: 'pnpm lint', format: null, build: null, dev: null, ...overrides.commands },
    conventions: { componentStyle: 'arrow', propsStyle: 'readonly', testColocation: true, barrelExports: true, strictTypes: true, ...overrides.conventions },
    agents: mergedAgents,
    selectedCommands: mergedSelectedCommands,
    targets: mergedTargets,
    governance: mergedGovernance,
    detectedAiAgents: { claudeCode: false, codexCli: false, cursor: false, aider: false, continueDev: false, copilot: false, windsurf: false, gemini: false, ...overrides.detectedAiAgents },
    monorepo: overrides.monorepo !== undefined ? overrides.monorepo : null,
    security: { ...SECURITY_DEFAULTS, ...overrides.security },
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
