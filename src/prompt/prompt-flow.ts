import type { DetectedStack } from '../detector/types.js';
import type { StackConfig } from '../schema/stack-config.js';
import { readPackageJson } from '../utils/index.js';
import { isFrontendFramework, supportsReactTsStack } from '../constants/frameworks.js';
import { createDefaultConfig } from './default-config.js';
import {
  askProjectIdentity,
  askStack,
  askTooling,
  askPaths,
  askConventions,
  askAgentSelection,
  askCommandSelection,
  askTargets,
  askGovernance,
} from './questions.js';
import { resolveCommands, resolvePackageManagerPrefix } from './commands.js';
import { toDetectedAiAgentFlags } from './detected-ai-flags.js';
export { resolveDefaultDescription, resolveDefaultProjectName } from './defaults.js';
export { createDefaultConfig } from './default-config.js';
export { resolveCommands, resolvePackageManagerPrefix } from './commands.js';
export { toDetectedAiAgentFlags } from './detected-ai-flags.js';

interface PromptFlowOptions {
  yes?: boolean;
}

/**
 * Builds a StackConfig by either creating defaults or interactively collecting project and tooling choices.
 *
 * @param detected - Detected stack and environment metadata used to seed defaults and detection-only fields (for example i18n).
 * @param projectRoot - Filesystem path to the project root; used to read package.json for existing scripts and metadata.
 * @param options - Optional flow modifiers.
 * @param options.yes - When true, bypasses interactive prompts and returns a default configuration derived from detections and package.json.
 * @returns A fully populated StackConfig containing project identity, stack definition (including detection-only i18n), tooling, resolved commands, paths, conventions, agent selections, selected workflow commands, targets, governance settings, detected AI agent flags, and monorepo (null when not applicable).
 */
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
  const governance = await askGovernance();

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
      // i18n is detection-only — no interactive override question (mirrors auth detection but auth is also user-promptable elsewhere).
      i18nLibrary: detected.i18n.value,
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
      workflowLonghorizon: selectedCommands.includes('workflowLonghorizon'),
      workflowTcr: selectedCommands.includes('workflowTcr'),
    },
    targets,
    governance,
    detectedAiAgents: toDetectedAiAgentFlags(detected),
    monorepo: null,
  };
}
