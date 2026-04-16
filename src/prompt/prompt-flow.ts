import type { DetectedStack } from '../detector/types.js';
import type { StackConfig } from '../schema/stack-config.js';
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

const FRONTEND_FRAMEWORKS = [
  'react', 'nextjs', 'expo', 'react-native', 'vue', 'nuxt',
  'angular', 'sveltekit', 'remix',
];

function resolvePackageManagerPrefix(pm: string): string {
  const prefixMap: Record<string, string> = {
    npm: 'npm run',
    pnpm: 'pnpm',
    yarn: 'yarn',
    bun: 'bun run',
  };
  return prefixMap[pm] ?? pm;
}

function resolveCommands(
  pm: string,
  testFramework: string,
  linter: string | null,
  language: string,
): StackConfig['commands'] {
  const prefix = resolvePackageManagerPrefix(pm);

  const typeCheckMap: Record<string, string> = {
    typescript: `${prefix} check-types`,
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
    test: testMap[testFramework] ?? `${prefix} test`,
    lint: linter ? (lintMap[linter] ?? `${prefix} lint`) : null,
    format: null,
    build: null,
    dev: null,
  };
}

export async function runPromptFlow(detected: DetectedStack): Promise<StackConfig> {
  const identity = await askProjectIdentity(detected);
  const stack = await askStack(detected);
  const tooling = await askTooling(detected);
  const paths = await askPaths(stack.framework);
  const conventions = await askConventions();

  const isFrontend = FRONTEND_FRAMEWORKS.includes(stack.framework);
  const selectedAgents = await askAgentSelection(isFrontend);
  const selectedCommands = await askCommandSelection();
  const targets = await askTargets();

  const commands = resolveCommands(
    tooling.packageManager,
    tooling.testFramework,
    tooling.linter,
    stack.language,
  );

  return {
    project: {
      name: identity.name,
      description: identity.description,
      locale: identity.locale,
      localeRules: identity.localeRules,
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
      codeReviewer: selectedAgents.includes('codeReviewer'),
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
  };
}
