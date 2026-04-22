import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext } from './types.js';
import { buildReviewChecklist } from './review-checklist-rules.js';
import { buildPermissions, buildDenyList, buildPostToolUseHooks, buildPreToolUseHooks } from './permissions.js';
import {
  isBackendFramework,
  isFrontendFramework,
  isMobileFramework,
  isReactFramework,
  supportsReactTsStack,
} from '../constants/frameworks.js';

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
    permissions: buildPermissions(config),
    denyList: buildDenyList(),
    postToolUseHooks: buildPostToolUseHooks({ lintCommand: config.commands.lint ?? null }),
    preToolUseHooks: buildPreToolUseHooks(),
    monorepo: config.monorepo,

    hasUiDesigner: config.agents.uiDesigner,
    hasE2eTester: config.agents.e2eTester,
    hasSecurityReviewer: config.agents.securityReviewer,
    hasReactTsSenior,
    testFramework: config.tooling.testFramework,
    testsDir: config.paths.testsDir,
  };
}

function buildStackItems(config: StackConfig): string[] {
  const items: string[] = [];
  const { stack, tooling } = config;

  items.push(`${capitalize(stack.language)} (${stack.runtime})`);
  if (stack.framework) items.push(capitalize(stack.framework));

  if (stack.uiLibrary) items.push(capitalize(stack.uiLibrary));
  if (stack.stateManagement) items.push(capitalize(stack.stateManagement));
  if (stack.database) items.push(capitalize(stack.database));
  if (stack.auth) items.push(capitalize(stack.auth));
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
