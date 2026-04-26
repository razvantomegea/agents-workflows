import { detectLanguage } from './detect-language.js';
import { detectFramework } from './detect-framework.js';
import { detectUiLibrary } from './detect-ui-library.js';
import { detectStateManagement } from './detect-state-management.js';
import { detectDatabase } from './detect-database.js';
import { detectTestFramework, detectTestLibrary } from './detect-testing.js';
import { detectLinter, detectFormatter } from './detect-linter.js';
import { detectPackageManager } from './detect-package-manager.js';
import { detectE2e } from './detect-e2e.js';
import { detectAuth } from './detect-auth.js';
import { detectI18n } from './detect-i18n.js';
import { detectAiAgents } from './detect-ai-agents.js';
import { detectDocsFile } from './detect-docs-file.js';
import { detectRoadmapFile } from './detect-roadmap-file.js';
import { detectMonorepo } from './detect-monorepo.js';
import type { DetectedStack } from './types.js';

/**
 * Detects the technology stack and developer tooling used by the project at the given root directory.
 *
 * @param projectRoot - Path to the project's root directory
 * @returns A `DetectedStack` object containing detection results for:
 * - `language`, `runtime`, `framework`, `uiLibrary`, `stateManagement`, `database`
 * - `auth`, `i18n`
 * - `testFramework`, `testLibrary`, `e2eFramework`
 * - `linter`, `formatter`, `packageManager`
 * - `monorepo`, `aiAgents`, `docsFile`, and `roadmapFile`
 *
 * Each field holds the detector's result (typically a `value` and a `confidence` score) where applicable.
 */
export async function detectStack(projectRoot: string): Promise<DetectedStack> {
  const [
    language,
    framework,
    uiLibrary,
    stateManagement,
    database,
    testFramework,
    testLibrary,
    linter,
    formatter,
    packageManager,
    e2eFramework,
    auth,
    i18n,
    aiAgents,
    docsFile,
    roadmapFile,
  ] = await Promise.all([
    detectLanguage(projectRoot),
    detectFramework(projectRoot),
    detectUiLibrary(projectRoot),
    detectStateManagement(projectRoot),
    detectDatabase(projectRoot),
    detectTestFramework(projectRoot),
    detectTestLibrary(projectRoot),
    detectLinter(projectRoot),
    detectFormatter(projectRoot),
    detectPackageManager(projectRoot),
    detectE2e(projectRoot),
    detectAuth(projectRoot),
    detectI18n(projectRoot),
    detectAiAgents(),
    detectDocsFile(projectRoot),
    detectRoadmapFile(projectRoot),
  ]);

  const runtime = resolveRuntime(language.value, framework.value);
  const monorepo = await detectMonorepo(projectRoot);

  return {
    language,
    runtime,
    framework,
    uiLibrary,
    stateManagement,
    database,
    auth,
    i18n,
    testFramework,
    testLibrary,
    e2eFramework,
    linter,
    formatter,
    packageManager,
    monorepo,
    aiAgents,
    docsFile,
    roadmapFile,
  };
}

export function resolveRuntime(
  language: string | null,
  framework: string | null,
): { value: string | null; confidence: number } {
  if (!language) return { value: null, confidence: 0 };

  const runtimeMap: Record<string, string> = {
    typescript: 'node',
    javascript: 'node',
    python: 'python',
    go: 'go',
    rust: 'rust',
    java: 'jvm',
    csharp: 'dotnet',
  };

  if (framework === 'expo' || framework === 'react-native') {
    return { value: 'react-native', confidence: 0.9 };
  }

  const runtime = runtimeMap[language];
  return runtime
    ? { value: runtime, confidence: 0.85 }
    : { value: null, confidence: 0 };
}

export { detectMonorepo } from './detect-monorepo.js';
