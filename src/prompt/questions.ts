import { input, confirm, checkbox } from '@inquirer/prompts';
import type { DetectedStack } from '../detector/types.js';
import type { PackageJson } from '../utils/index.js';
import { isFrontendFramework } from '../constants/frameworks.js';
import { safeProjectDescription, safeProjectPath } from '../schema/stack-config.js';
import { resolveDefaultDescription, resolveDefaultProjectName } from './defaults.js';

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

  const localeRules = localeRulesRaw ? localeRulesRaw.split(',').map((r) => r.trim()).filter(Boolean) : [];

  const projectDocumentation = await askProjectDocumentationFiles({
    docsFile: detected.docsFile.value,
    roadmapFile: detected.roadmapFile.value,
  });
  const mainBranch = await askMainBranch('main');

  return { name, description, locale, localeRules, ...projectDocumentation, mainBranch };
}

export interface ProjectDocumentationFiles {
  docsFile: string | null;
  roadmapFile: string | null;
}

export async function askProjectDocumentationFiles(
  defaults: Readonly<ProjectDocumentationFiles>,
): Promise<ProjectDocumentationFiles> {
  const docsFile = await askOptionalProjectPath({
    message: 'Primary documentation file (path relative to project root, blank to skip):',
    defaultValue: defaults.docsFile,
  });
  const roadmapFile = await askOptionalProjectPath({
    message: 'Roadmap/PRD file (path relative to project root, blank to skip):',
    defaultValue: defaults.roadmapFile,
  });

  return { docsFile, roadmapFile };
}

async function askOptionalProjectPath(
  params: Readonly<{ message: string; defaultValue: string | null }>,
): Promise<string | null> {
  const raw = await input({
    message: params.message,
    default: params.defaultValue ?? '',
    validate: (value: string): true | string => {
      const trimmed = value.trim();
      if (trimmed === '') return true;
      return safeProjectPath.safeParse(trimmed).success
        ? true
        : 'Use a relative project path without spaces, parent traversal, control characters, or markdown metacharacters.';
    },
  });
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

export async function askMainBranch(defaultBranch: string): Promise<string> {
  const trimmed = (await input({
    message: 'Primary branch for new work (main/master/trunk/develop/etc.):',
    default: defaultBranch,
    validate: (value: string): true | string => value.trim() === '' || /^[a-zA-Z0-9._/-]+$/.test(value.trim()) ? true : 'Use only letters, numbers, slash, dot, underscore, or hyphen.',
  })).trim();
  return trimmed === '' ? defaultBranch : trimmed;
}

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

export async function askConventions(): Promise<{
  testColocation: boolean;
  barrelExports: boolean;
  strictTypes: boolean;
}> {
  const testColocation = await confirm({ message: 'Colocate tests next to source files?', default: true });
  const barrelExports = await confirm({ message: 'Use barrel exports (index.ts)?', default: true });
  const strictTypes = await confirm({ message: 'Strict types (no any)?', default: true });

  return { testColocation, barrelExports, strictTypes };
}

export async function askAgentSelection(
  params: Readonly<{ isFrontend: boolean; isReactTs: boolean }>,
): Promise<string[]> {
  const { isFrontend, isReactTs } = params;
  const choices = [
    { name: 'architect — Planning agent (Opus)', value: 'architect', checked: true },
    { name: 'implementer — Primary implementation agent', value: 'implementer', checked: true },
    ...(isReactTs
      ? [{ name: 'react-ts-senior — Senior React + TypeScript implementation agent', value: 'reactTsSenior', checked: true }]
      : []),
    { name: 'code-reviewer — Post-edit review with checklist', value: 'codeReviewer', checked: true },
    { name: 'security-reviewer — OWASP/security audit (parallel to code-reviewer)', value: 'securityReviewer', checked: true },
    { name: 'code-optimizer — Performance & quality analysis', value: 'codeOptimizer', checked: true },
    { name: 'test-writer — Unit test generation', value: 'testWriter', checked: true },
    { name: 'e2e-tester — E2E test generation', value: 'e2eTester', checked: false },
    { name: 'reviewer — Review loop orchestrator', value: 'reviewer', checked: true },
    { name: 'ui-designer — UI/UX design system enforcement', value: 'uiDesigner', checked: isFrontend },
  ];

  return checkbox({ message: 'Select agents to generate:', choices });
}

const COMMAND_CHOICES = [
  { name: '/workflow-plan — End-to-end feature workflow', value: 'workflowPlan', checked: true },
  { name: '/workflow-fix — Fix QA issues', value: 'workflowFix', checked: true },
  { name: '/external-review — External review tool integration', value: 'externalReview', checked: false },
  { name: '/workflow-longhorizon - Multi-session long-horizon harness', value: 'workflowLonghorizon', checked: false },
  { name: '/workflow-tcr — TCR (test && commit || revert)', value: 'workflowTcr', checked: false },
] as const;

/** Prompt the user to choose which CLI command workflows to generate. */
export async function askCommandSelection(): Promise<string[]> {
  return checkbox({ message: 'Select commands to generate:', choices: [...COMMAND_CHOICES] });
}

export { askTargets } from './ask-targets.js';
export { askGovernance } from './ask-governance.js';
export { askIsolation } from './ask-isolation.js';
export { askNonInteractiveMode, HOST_OS_ACCEPT_PHRASE } from './ask-non-interactive.js';
export { enableNonInteractiveWithIsolation } from './enable-non-interactive-with-isolation.js';
