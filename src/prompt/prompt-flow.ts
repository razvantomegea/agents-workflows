import type { DetectedStack } from '../detector/types.js';
import type { IsolationChoice, StackConfig } from '../schema/stack-config.js';
import { readPackageJson } from '../utils/index.js';
import { isFrontendFramework } from '../constants/frameworks.js';
import { createDefaultConfig } from './default-config.js';
import {
  askProjectIdentity,
  askStack,
  askTooling,
  askPaths,
} from './questions.js';
import { askCommandSelection } from './ask-command-selection.js';
import { askConventions } from './ask-conventions.js';
import { askAgentSelection } from './ask-agent-selection.js';
import { askTargets } from './ask-targets.js';
import { askGovernance } from './ask-governance.js';
import { askNonInteractiveMode } from './ask-non-interactive.js';
import { askImplementerVariant } from './ask-implementer-variant.js';
import { askIsolation } from './ask-isolation.js';
import { askCavemanStyle } from './ask-caveman-style.js';
import { askPluginSelection } from './ask-plugin-selection.js';
import { resolveCommands, resolvePackageManagerPrefix } from './commands.js';
import { toDetectedAiAgentFlags } from './detected-ai-flags.js';
import { resolveTargetDefaults } from './ask-targets.js';
import { getApplicableImplementerVariantForStack } from '../generator/implementer-routing.js';
export { resolveDefaultDescription, resolveDefaultProjectName } from './defaults.js';
export { createDefaultConfig } from './default-config.js';
export { resolveCommands, resolvePackageManagerPrefix } from './commands.js';
export { toDetectedAiAgentFlags } from './detected-ai-flags.js';
export {
  resolveWorkspaceSelection,
  type ResolveWorkspaceSelectionOptions,
} from './resolve-workspace-selection.js';

export interface PromptFlowOptions {
  yes?: boolean;
  nonInteractive?: boolean;
  isolation?: IsolationChoice;
  acceptRisks?: boolean;
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
    const baseConfig = createDefaultConfig(detected, pkg?.scripts ?? {}, pkg);
    const targets = await resolveTargetDefaults({ detected: detected.aiAgents, projectRoot });
    const isolation = await askIsolation({ yes: true, isolation: options.isolation });
    const security = await askNonInteractiveMode({
      yes: true,
      nonInteractive: options.nonInteractive,
      isolation,
      acceptRisks: options.acceptRisks,
    });
    return { ...baseConfig, targets, security, plugins: baseConfig.plugins, cavemanStyle: false };
  }

  const identity = await askProjectIdentity(detected, pkg);
  const stack = await askStack(detected);
  const tooling = await askTooling(detected);
  const paths = await askPaths(stack.framework);
  const conventions = await askConventions();

  const isFrontend = isFrontendFramework(stack.framework);
  const selectedAgents = await askAgentSelection({ isFrontend });
  const implementerEnabled = selectedAgents.includes('implementer');
  const implementerVariant = implementerEnabled
    ? await askImplementerVariant({ language: stack.language, framework: stack.framework })
    : getApplicableImplementerVariantForStack({ language: stack.language, framework: stack.framework });
  const selectedCommands = await askCommandSelection();
  const targets = await askTargets({ detected: detected.aiAgents, projectRoot });
  const governance = await askGovernance();
  const plugins = await askPluginSelection();
  const cavemanStyle = await askCavemanStyle();
  const isolation = await askIsolation({ isolation: options.isolation });
  const security = await askNonInteractiveMode({
    nonInteractive: options.nonInteractive,
    isolation,
    acceptRisks: options.acceptRisks,
  });

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
      roadmapFile: identity.roadmapFile,
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
      testColocation: conventions.testColocation,
      barrelExports: conventions.barrelExports,
      strictTypes: conventions.strictTypes,
    },
    agents: {
      architect: selectedAgents.includes('architect'),
      implementer: selectedAgents.includes('implementer'),
      implementerVariant,
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
    languages: [...detected.languages],
    monorepo: null,
    security,
    plugins,
    cavemanStyle,
  };
}
