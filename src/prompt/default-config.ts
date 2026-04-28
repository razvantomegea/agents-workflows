import type { DetectedStack } from '../detector/types.js';
import type { StackConfig } from '../schema/stack-config.js';
import { SECURITY_DEFAULTS } from '../schema/stack-config.js';
import type { PackageJson } from '../utils/index.js';
import { isFrontendFramework } from '../constants/frameworks.js';
import { getApplicableImplementerVariant } from '../generator/implementer-routing.js';
import { resolveDefaultDescription, resolveDefaultProjectName } from './defaults.js';
import { resolveCommands, resolvePackageManagerPrefix, type PackageScripts } from './commands.js';
import { toDetectedAiAgentFlags } from './detected-ai-flags.js';
import { resolveTargetDefaultsSync } from './ask-targets.js';

/**
 * Builds a complete StackConfig from detected stack information, optional package scripts, and optional package.json metadata.
 *
 * @param detected - Detected stack values produced by environment analysis (language, runtime, framework, tools, AI agent flags, etc.)
 * @param scripts - Optional package.json `scripts` entries used to influence the resolved command set
 * @param pkg - Optional parsed package.json used to resolve default project name and description
 * @returns A fully populated StackConfig containing resolved project, stack, tooling, paths, commands, conventions, agents, selected commands, targets, governance, detected AI agents, and monorepo settings
 */
export function createDefaultConfig(
  detected: DetectedStack,
  scripts: PackageScripts = {},
  pkg: PackageJson | null = null,
): StackConfig {
  const language = detected.language.value ?? 'typescript';
  const runtime = detected.runtime.value ?? 'node';
  const framework = detected.framework.value;
  const isFrontend = isFrontendFramework(framework);
  const packageManager = detected.packageManager.value ?? 'npm';
  const testFramework = detected.testFramework.value ?? 'jest';
  const linter = detected.linter.value;

  const targets = resolveTargetDefaultsSync({ detected: detected.aiAgents });

  return {
    project: {
      name: resolveDefaultProjectName(pkg),
      description: resolveDefaultDescription(pkg, framework, language),
      locale: 'en',
      localeRules: [],
      docsFile: detected.docsFile.value,
      roadmapFile: detected.roadmapFile.value,
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
      i18nLibrary: detected.i18n.value,
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
      testColocation: true,
      barrelExports: true,
      strictTypes: true,
    },
    agents: {
      architect: true,
      implementer: true,
      implementerVariant: getApplicableImplementerVariant(detected),
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
      workflowLonghorizon: false,
      workflowTcr: false,
    },
    targets,
    governance: { enabled: false },
    detectedAiAgents: toDetectedAiAgentFlags(detected),
    languages: [...detected.languages],
    monorepo: null,
    security: { ...SECURITY_DEFAULTS },
  };
}
