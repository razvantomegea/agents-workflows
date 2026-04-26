import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext } from './types.js';
import { buildReviewChecklist } from './review-checklist-rules.js';
import { buildPermissions, buildDenyList, buildPostToolUseHooks, buildPreToolUseHooks } from './permissions.js';
import { ALLOWED_DOMAINS } from './permission-constants.js';
import {
  isBackendFramework,
  isFrontendFramework,
  isMobileFramework,
  isReactFramework,
  supportsReactTsStack,
} from '../constants/frameworks.js';

/**
 * Constructs a GeneratorContext object from the provided StackConfig.
 *
 * The returned context includes direct passthrough values from the config (project, stack,
 * tooling, paths, commands, conventions, detectedAiAgents, monorepo, etc.), computed template
 * flags (for example: isReact, isFrontend, isMobile, isBackend, isTypescript, hasI18n,
 * hasReactTsSenior), a human-readable `stackItems` list, paths for components/utils/tests,
 * review/permission/deny lists and pre/post tool hooks, agent feature flags, and test tooling info.
 *
 * @param config - The stack/project/tooling configuration used to derive the generator context
 * @returns A GeneratorContext populated with configuration values and derived helper flags/lists
 */
export function buildContext(config: StackConfig): GeneratorContext {
  const isReact = isReactFramework(config.stack.framework);
  const isFrontend = isFrontendFramework(config.stack.framework);
  const isMobile = isMobileFramework(config.stack.framework);
  const isBackend = isBackendFramework(config.stack.framework);
  const isTypescript = config.stack.language.trim().toLowerCase() === 'typescript';
  const hasReactTsSenior = config.agents.reactTsSenior
    && supportsReactTsStack(config.stack.framework, config.stack.language);

  return {
    project: config.project,
    stack: config.stack,
    tooling: config.tooling,
    paths: config.paths,
    commands: config.commands,
    conventions: config.conventions,
    detectedAiAgents: config.detectedAiAgents,

    stackItems: buildStackItems(config),
    isTypescript,
    isReact,
    isMobile,
    isFrontend,
    isBackend,

    componentsDir: config.paths.componentsDir,
    utilsDir: config.paths.utilsDir,
    localeRules: config.project.localeRules,
    docsFile: config.project.docsFile,
    mainBranch: config.project.mainBranch,

    reviewChecklist: buildReviewChecklist(config),
    permissions: buildPermissions({ tooling: config.tooling, commands: config.commands }),
    denyList: buildDenyList(),
    allowedDomains: ALLOWED_DOMAINS,
    postToolUseHooks: buildPostToolUseHooks({ lintCommand: config.commands.lint ?? null }),
    preToolUseHooks: buildPreToolUseHooks(),
    monorepo: config.monorepo,

    hasUiDesigner: config.agents.uiDesigner,
    hasE2eTester: config.agents.e2eTester,
    hasSecurityReviewer: config.agents.securityReviewer,
    hasReactTsSenior,
    hasI18n: Boolean(config.stack.i18nLibrary),
    i18nLibrary: config.stack.i18nLibrary,
    testFramework: config.tooling.testFramework,
    testsDir: config.paths.testsDir,
    security: config.security,
  };
}

/**
 * Build a human-readable list of stack and tooling components from the provided configuration for use in templates.
 *
 * @param config - The project configuration containing `stack` and `tooling` details
 * @returns An ordered array of short, display-ready strings describing the language/runtime, framework, selected libraries, and tooling (e.g., "TypeScript (node)", "React", "Jest (testing)", "ESLint (linter)")
 */
function buildStackItems(config: StackConfig): string[] {
  const items: string[] = [];
  const { stack, tooling } = config;

  items.push(`${capitalize(stack.language)} (${stack.runtime})`);
  if (stack.framework) items.push(capitalize(stack.framework));

  if (stack.uiLibrary) items.push(capitalize(stack.uiLibrary));
  if (stack.stateManagement) items.push(capitalize(stack.stateManagement));
  if (stack.database) items.push(capitalize(stack.database));
  if (stack.auth) items.push(capitalize(stack.auth));
  // i18nLibrary intentionally not summarised here — surfaced via hasI18n template flag instead.
  if (tooling.testFramework) items.push(`${capitalize(tooling.testFramework)} (testing)`);
  if (tooling.testLibrary) items.push(capitalize(tooling.testLibrary));
  if (tooling.linter) items.push(`${capitalize(tooling.linter)} (linter)`);
  if (tooling.formatter) items.push(`${capitalize(tooling.formatter)} (formatter)`);
  if (tooling.packageManager) items.push(`${tooling.packageManager} (package manager)`);

  return items;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
