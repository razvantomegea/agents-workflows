import type { DetectedStack } from '../detector/types.js';
import type { StackConfig } from '../schema/stack-config.js';
import { readPackageJson, type PackageJson } from '../utils/index.js';
import { isDetected } from '../detector/detect-ai-agents.js';
import { isFrontendFramework, supportsReactTsStack } from '../constants/frameworks.js';
import {
  resolveDefaultDescription,
  resolveDefaultProjectName,
} from './defaults.js';
import {
  askProjectIdentity,
  askStack,
  askTooling,
  askPaths,
  askConventions,
  askAgentSelection,
  askCommandSelection,
  askTargets,
} from './questions.js';

export { resolveDefaultDescription, resolveDefaultProjectName } from './defaults.js';

function resolvePackageManagerPrefix(pm: string): string {
  const prefixMap: Record<string, string> = {
    npm: 'npm run',
    pnpm: 'pnpm',
    yarn: 'yarn',
    bun: 'bun run',
  };
  return prefixMap[pm] ?? pm;
}

interface PromptFlowOptions {
  yes?: boolean;
}

type PackageScripts = Record<string, string>;

export function resolveCommands(
  pm: string,
  testFramework: string,
  linter: string | null,
  language: string,
  scripts: PackageScripts = {},
): StackConfig['commands'] {
  const prefix = resolvePackageManagerPrefix(pm);
  const packageCommand = (scriptName: string): string => `${prefix} ${scriptName}`;
  const scriptCommand = (names: string[]): string | null => {
    const match = names.find((name) => scripts[name]);
    return match ? packageCommand(match) : null;
  };

  const typeCheckMap: Record<string, string> = {
    typescript: scriptCommand(['check-types', 'typecheck', 'type-check', 'tsc']) ?? `${prefix} check-types`,
    python: 'mypy .',
    go: 'go vet ./...',
  };

  const testMap: Record<string, string> = {
    jest: `${prefix} test`,
    vitest: `${prefix} test`,
    pytest: 'pytest',
    'go-test': 'go test ./...',
  };

  const lintMap: Record<string, string> = {
    eslint: `${prefix} lint`,
    oxlint: `${prefix} lint`,
    biome: `${prefix} lint`,
    ruff: 'ruff check .',
  };

  return {
    typeCheck: typeCheckMap[language] ?? null,
    test: scriptCommand(['test']) ?? testMap[testFramework] ?? `${prefix} test`,
    lint: scriptCommand(['lint']) ?? (linter ? (lintMap[linter] ?? `${prefix} lint`) : null),
    format: scriptCommand(['format', 'fmt']),
    build: scriptCommand(['build']),
    dev: scriptCommand(['dev', 'start']),
  };
}

export async function runPromptFlow(
  detected: DetectedStack,
  projectRoot: string,
  options: PromptFlowOptions = {},
): Promise<StackConfig> {
  const pkg = await readPackageJson(projectRoot);

  if (options.yes) {
    return createDefaultConfig(detected, pkg?.scripts ?? {}, pkg);
  }

  const identity = await askProjectIdentity(detected, pkg);
  const stack = await askStack(detected);
  const tooling = await askTooling(detected);
  const paths = await askPaths(stack.framework);
  const conventions = await askConventions();

  const isFrontend = isFrontendFramework(stack.framework);
  const isReactTs = supportsReactTsStack(stack.framework, stack.language);
  const selectedAgents = await askAgentSelection({ isFrontend, isReactTs });
  const selectedCommands = await askCommandSelection();
  const targets = await askTargets(detected.aiAgents);

  const commands = resolveCommands(
    tooling.packageManager,
    tooling.testFramework,
    tooling.linter,
    stack.language,
    pkg?.scripts ?? {},
  );

  return {
    project: {
      name: identity.name,
      description: identity.description,
      locale: identity.locale,
      localeRules: identity.localeRules,
      docsFile: identity.docsFile,
      mainBranch: identity.mainBranch,
    },
    stack: {
      language: stack.language,
      runtime: stack.runtime,
      framework: stack.framework,
      uiLibrary: stack.uiLibrary,
      stateManagement: stack.stateManagement,
      database: stack.database,
      auth: null,
    },
    tooling: {
      packageManager: tooling.packageManager,
      packageManagerPrefix: resolvePackageManagerPrefix(tooling.packageManager),
      testFramework: tooling.testFramework,
      testLibrary: detected.testLibrary.value,
      e2eFramework: tooling.e2eFramework,
      linter: tooling.linter,
      formatter: tooling.formatter,
    },
    paths: {
      sourceRoot: paths.sourceRoot,
      componentsDir: paths.componentsDir,
      hooksDir: isFrontend ? `${paths.sourceRoot}hooks/` : null,
      utilsDir: paths.utilsDir,
      testsDir: conventions.testColocation ? null : 'tests/',
      designTokensFile: null,
      i18nDir: null,
      testConfigFile: null,
    },
    commands,
    conventions: {
      componentStyle: 'arrow',
      propsStyle: 'readonly',
      maxFileLength: conventions.maxFileLength,
      testColocation: conventions.testColocation,
      barrelExports: conventions.barrelExports,
      strictTypes: conventions.strictTypes,
    },
    agents: {
      architect: selectedAgents.includes('architect'),
      implementer: selectedAgents.includes('implementer'),
      reactTsSenior: selectedAgents.includes('reactTsSenior'),
      codeReviewer: selectedAgents.includes('codeReviewer'),
      securityReviewer: selectedAgents.includes('securityReviewer'),
      codeOptimizer: selectedAgents.includes('codeOptimizer'),
      testWriter: selectedAgents.includes('testWriter'),
      e2eTester: selectedAgents.includes('e2eTester'),
      reviewer: selectedAgents.includes('reviewer'),
      uiDesigner: selectedAgents.includes('uiDesigner'),
    },
    selectedCommands: {
      workflowPlan: selectedCommands.includes('workflowPlan'),
      workflowFix: selectedCommands.includes('workflowFix'),
      externalReview: selectedCommands.includes('externalReview'),
    },
    targets,
    detectedAiAgents: toDetectedAiAgentFlags(detected),
    monorepo: null,
  };
}

export function createDefaultConfig(
  detected: DetectedStack,
  scripts: PackageScripts = {},
  pkg: PackageJson | null = null,
): StackConfig {
  const language = detected.language.value ?? 'typescript';
  const runtime = detected.runtime.value ?? 'node';
  const framework = detected.framework.value;
  const isFrontend = isFrontendFramework(framework);
  const isReactTs = supportsReactTsStack(framework, language);
  const packageManager = detected.packageManager.value ?? 'npm';
  const testFramework = detected.testFramework.value ?? 'jest';
  const linter = detected.linter.value;

  const targets = {
    claudeCode: detected.aiAgents.hasClaudeCode || !detected.aiAgents.hasCodexCli,
    codexCli: detected.aiAgents.hasCodexCli,
  };

  return {
    project: {
      name: resolveDefaultProjectName(pkg),
      description: resolveDefaultDescription(pkg, framework, language),
      locale: 'en',
      localeRules: [],
      docsFile: detected.docsFile.value,
      mainBranch: 'main',
    },
    stack: {
      language,
      runtime,
      framework,
      uiLibrary: detected.uiLibrary.value,
      stateManagement: detected.stateManagement.value,
      database: detected.database.value,
      auth: detected.auth.value,
    },
    tooling: {
      packageManager,
      packageManagerPrefix: resolvePackageManagerPrefix(packageManager),
      testFramework,
      testLibrary: detected.testLibrary.value,
      e2eFramework: detected.e2eFramework.value,
      linter,
      formatter: detected.formatter.value,
    },
    paths: {
      sourceRoot: 'src/',
      componentsDir: isFrontend ? 'src/components/' : null,
      hooksDir: isFrontend ? 'src/hooks/' : null,
      utilsDir: 'src/utils/',
      testsDir: null,
      designTokensFile: null,
      i18nDir: null,
      testConfigFile: null,
    },
    commands: resolveCommands(packageManager, testFramework, linter, language, scripts),
    conventions: {
      componentStyle: 'arrow',
      propsStyle: 'readonly',
      maxFileLength: 200,
      testColocation: true,
      barrelExports: true,
      strictTypes: true,
    },
    agents: {
      architect: true,
      implementer: true,
      reactTsSenior: isReactTs,
      codeReviewer: true,
      securityReviewer: true,
      codeOptimizer: true,
      testWriter: true,
      e2eTester: false,
      reviewer: true,
      uiDesigner: isFrontend,
    },
    selectedCommands: {
      workflowPlan: true,
      workflowFix: true,
      externalReview: false,
    },
    targets,
    detectedAiAgents: toDetectedAiAgentFlags(detected),
    monorepo: null,
  };
}

function toDetectedAiAgentFlags(detected: DetectedStack): StackConfig['detectedAiAgents'] {
  const isPresent = (id: string): boolean =>
    isDetected(detected.aiAgents.agents.find((candidate) => candidate.id === id));

  return {
    claudeCode: detected.aiAgents.hasClaudeCode,
    codexCli: detected.aiAgents.hasCodexCli,
    cursor: isPresent('cursor'),
    aider: isPresent('aider'),
    continueDev: isPresent('continue'),
    copilot: isPresent('copilot'),
    windsurf: isPresent('windsurf'),
    gemini: isPresent('gemini'),
  };
}
