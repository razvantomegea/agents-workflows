import { input, confirm, checkbox } from '@inquirer/prompts';
import type { DetectedStack } from '../detector/types.js';

function useDetectedOr<T>(detection: { value: T | null; confidence: number }, fallback: T): T {
  return detection.confidence >= 0.7 && detection.value !== null ? detection.value : fallback;
}

export async function askProjectIdentity(detected: DetectedStack): Promise<{
  name: string;
  description: string;
  locale: string;
  localeRules: string[];
}> {
  const name = await input({
    message: 'Project name:',
    default: 'my-project',
  });

  const description = await input({
    message: 'Short description:',
    default: `A ${useDetectedOr(detected.framework, 'web')} application`,
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
    ? localeRulesRaw.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  return { name, description, locale, localeRules };
}

export async function askStack(detected: DetectedStack): Promise<{
  language: string;
  runtime: string;
  framework: string;
  uiLibrary: string | null;
  stateManagement: string | null;
  database: string | null;
}> {
  const language = useDetectedOr(detected.language, '');
  const runtime = useDetectedOr(detected.runtime, '');
  const framework = useDetectedOr(detected.framework, '');

  const confirmedLanguage = language || await input({ message: 'Language:', default: 'typescript' });
  const confirmedRuntime = runtime || await input({ message: 'Runtime:', default: 'node' });
  const confirmedFramework = framework || await input({ message: 'Framework:', default: 'react' });

  return {
    language: confirmedLanguage,
    runtime: confirmedRuntime,
    framework: confirmedFramework,
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

export async function askPaths(framework: string): Promise<{
  sourceRoot: string;
  componentsDir: string | null;
  utilsDir: string;
}> {
  const isFrontend = ['react', 'nextjs', 'expo', 'react-native', 'vue', 'nuxt', 'angular', 'sveltekit'].includes(framework);

  const sourceRoot = await input({
    message: 'Source root directory:',
    default: 'src/',
  });

  const componentsDir = isFrontend
    ? await input({ message: 'Components directory:', default: `${sourceRoot}components/` })
    : null;

  const utilsDir = await input({
    message: 'Utils/lib directory:',
    default: `${sourceRoot}utils/`,
  });

  return { sourceRoot, componentsDir, utilsDir };
}

export async function askConventions(): Promise<{
  maxFileLength: number;
  testColocation: boolean;
  barrelExports: boolean;
  strictTypes: boolean;
}> {
  const maxFileLengthRaw = await input({ message: 'Max file length:', default: '200' });
  const parsedMaxFileLength = parseInt(maxFileLengthRaw, 10);
  const maxFileLength =
    Number.isNaN(parsedMaxFileLength) || parsedMaxFileLength <= 0
      ? 200
      : parsedMaxFileLength;
  const testColocation = await confirm({ message: 'Colocate tests next to source files?', default: true });
  const barrelExports = await confirm({ message: 'Use barrel exports (index.ts)?', default: true });
  const strictTypes = await confirm({ message: 'Strict types (no any)?', default: true });

  return { maxFileLength, testColocation, barrelExports, strictTypes };
}

export async function askAgentSelection(isFrontend: boolean): Promise<string[]> {
  const choices = [
    { name: 'architect — Planning agent (Opus)', value: 'architect', checked: true },
    { name: 'implementer — Primary implementation agent', value: 'implementer', checked: true },
    { name: 'code-reviewer — Post-edit review with checklist', value: 'codeReviewer', checked: true },
    { name: 'code-optimizer — Performance & quality analysis', value: 'codeOptimizer', checked: true },
    { name: 'test-writer — Unit test generation', value: 'testWriter', checked: true },
    { name: 'e2e-tester — E2E test generation', value: 'e2eTester', checked: false },
    { name: 'reviewer — Review loop orchestrator', value: 'reviewer', checked: true },
    { name: 'ui-designer — UI/UX design system enforcement', value: 'uiDesigner', checked: isFrontend },
  ];

  return checkbox({ message: 'Select agents to generate:', choices });
}

export async function askCommandSelection(): Promise<string[]> {
  const choices = [
    { name: '/workflow-plan — End-to-end feature workflow', value: 'workflowPlan', checked: true },
    { name: '/workflow-fix — Fix QA issues', value: 'workflowFix', checked: true },
    { name: '/external-review — External review tool integration', value: 'externalReview', checked: false },
  ];

  return checkbox({ message: 'Select commands to generate:', choices });
}

export async function askTargets(detected: DetectedStack['aiAgents']): Promise<{ claudeCode: boolean; codexCli: boolean }> {
  const claudeDefault = detected.hasClaudeCode || !detected.hasCodexCli;
  const codexDefault = detected.hasCodexCli;
  const claudeCode = await confirm({ message: 'Generate Claude Code config (.claude/)?', default: claudeDefault });
  const codexCli = await confirm({ message: 'Generate Codex CLI config (.codex/)?', default: codexDefault });

  return { claudeCode, codexCli };
}
