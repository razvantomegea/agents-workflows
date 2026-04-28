import { input } from '@inquirer/prompts';
import type { DetectedStack } from '../detector/types.js';
import type { PackageJson } from '../utils/index.js';
import { isFrontendFramework } from '../constants/frameworks.js';
import { safeProjectDescription, safeProjectPath } from '../schema/stack-config.js';
import { resolveDefaultDescription, resolveDefaultProjectName } from './defaults.js';
import {
  askProjectDocumentationFiles,
  askMainBranch,
  type ProjectDocumentationFiles,
} from './ask-project-docs.js';

function useDetectedOr<T>(detection: { value: T | null; confidence: number }, fallback: T): T {
  return detection.confidence >= 0.7 && detection.value !== null ? detection.value : fallback;
}

export async function askProjectIdentity(
  detected: DetectedStack,
  pkg: PackageJson | null = null,
): Promise<{
  name: string;
  description: string;
  locale: string;
  localeRules: string[];
  docsFile: string | null;
  roadmapFile: string | null;
  mainBranch: string;
}> {
  const language = detected.language.value ?? 'typescript';

  const name = await input({
    message: 'Project name:',
    default: resolveDefaultProjectName(pkg),
  });

  const description = await input({
    message: 'Short description:',
    default: resolveDefaultDescription(pkg, detected.framework.value, language),
    validate: (value: string): true | string => safeProjectDescription.safeParse(value).success
      ? true
      : 'Use a short single-line plain-text description without markdown, HTML, backticks, or control characters.',
  });

  const locale = await input({
    message: 'Primary locale:',
    default: 'en',
  });

  const localeRulesRaw = await input({
    message: 'Locale-specific rules (comma-separated, or skip):',
    default: '',
  });

  const localeRules = localeRulesRaw
    ? localeRulesRaw.split(',').map((rule: string) => rule.trim()).filter(Boolean)
    : [];

  const projectDocumentation = await askProjectDocumentationFiles({
    docsFile: detected.docsFile.value,
    roadmapFile: detected.roadmapFile.value,
  });
  const mainBranch = await askMainBranch('main');

  return { name, description, locale, localeRules, ...projectDocumentation, mainBranch };
}

export type { ProjectDocumentationFiles } from './ask-project-docs.js';
export { askProjectDocumentationFiles, askMainBranch } from './ask-project-docs.js';

export async function askStack(detected: DetectedStack): Promise<{
  language: string;
  runtime: string;
  framework: string | null;
  uiLibrary: string | null;
  stateManagement: string | null;
  database: string | null;
}> {
  const language = useDetectedOr(detected.language, '');
  const runtime = useDetectedOr(detected.runtime, '');
  const framework = useDetectedOr(detected.framework, '');

  const confirmedLanguage = language || await input({ message: 'Language:', default: 'typescript' });
  const confirmedRuntime = runtime || await input({ message: 'Runtime:', default: 'node' });
  const confirmedFramework = framework || await input({
    message: 'Framework (leave blank if none):',
    default: '',
  });

  return {
    language: confirmedLanguage,
    runtime: confirmedRuntime,
    framework: confirmedFramework.trim() === '' ? null : confirmedFramework,
    uiLibrary: detected.uiLibrary.value,
    stateManagement: detected.stateManagement.value,
    database: detected.database.value,
  };
}

export async function askTooling(detected: DetectedStack): Promise<{
  packageManager: string;
  testFramework: string;
  e2eFramework: string | null;
  linter: string | null;
  formatter: string | null;
}> {
  const packageManager = useDetectedOr(detected.packageManager, '');
  const testFramework = useDetectedOr(detected.testFramework, '');

  return {
    packageManager: packageManager || await input({ message: 'Package manager:', default: 'npm' }),
    testFramework: testFramework || await input({ message: 'Test framework:', default: 'jest' }),
    e2eFramework: detected.e2eFramework.value,
    linter: detected.linter.value,
    formatter: detected.formatter.value,
  };
}

export async function askPaths(framework: string | null): Promise<{
  sourceRoot: string;
  componentsDir: string | null;
  utilsDir: string;
}> {
  const isFrontend = isFrontendFramework(framework);

  const sourceRoot = await input({
    message: 'Source root directory:',
    default: 'src/',
    validate: validateRequiredProjectPath,
  });

  const componentsDir = isFrontend
    ? await input({ message: 'Components directory:', default: `${sourceRoot}components/`, validate: validateRequiredProjectPath })
    : null;

  const utilsDir = await input({
    message: 'Utils/lib directory:',
    default: `${sourceRoot}utils/`,
    validate: validateRequiredProjectPath,
  });

  return {
    sourceRoot: sourceRoot.trim(),
    componentsDir: componentsDir?.trim() ?? null,
    utilsDir: utilsDir.trim(),
  };
}

function validateRequiredProjectPath(value: string): true | string {
  return safeProjectPath.safeParse(value.trim()).success
    ? true
    : 'Use a relative project path without spaces, parent traversal, control characters, or markdown metacharacters.';
}

export { askConventions } from './ask-conventions.js';
export { askAgentSelection } from './ask-agent-selection.js';
export { askCommandSelection } from './ask-command-selection.js';
export { askTargets } from './ask-targets.js';
export { askGovernance } from './ask-governance.js';
export { askIsolation } from './ask-isolation.js';
export { askNonInteractiveMode, HOST_OS_ACCEPT_PHRASE } from './ask-non-interactive.js';
export { enableNonInteractiveWithIsolation } from './enable-non-interactive-with-isolation.js';
export { askWorkspaceSelection } from './ask-workspace-selection.js';
export { askImplementerVariant } from './ask-implementer-variant.js';
