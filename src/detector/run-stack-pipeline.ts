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
import type { Detection } from './types.js';

export interface StackPipelineResult {
  language: Detection;
  framework: Detection;
  uiLibrary: Detection;
  stateManagement: Detection;
  database: Detection;
  testFramework: Detection;
  testLibrary: Detection;
  linter: Detection;
  formatter: Detection;
  packageManager: Detection;
  e2eFramework: Detection;
  auth: Detection;
  i18n: Detection;
}

const RUNTIME_MAP: Record<string, string> = {
  typescript: 'node',
  javascript: 'node',
  python: 'python',
  go: 'go',
  rust: 'rust',
  java: 'jvm',
  csharp: 'dotnet',
};

/**
 * Derives a runtime value from a detected language and framework pair.
 * Moved here from detect-stack.ts so detect-workspace-stack.ts can import it
 * without creating a cycle through detect-stack.ts.
 */
export function resolveRuntime(
  language: string | null,
  framework: string | null,
): { value: string | null; confidence: number } {
  if (!language) return { value: null, confidence: 0 };

  if (framework === 'expo' || framework === 'react-native') {
    return { value: 'react-native', confidence: 0.9 };
  }

  const runtime = RUNTIME_MAP[language];
  return runtime
    ? { value: runtime, confidence: 0.85 }
    : { value: null, confidence: 0 };
}

/**
 * Runs the per-directory stack detection pipeline (all detectors except root-only ones).
 * Used by both `detectStack` (root) and `detectWorkspaceStack` (per-workspace).
 * Also exports `resolveRuntime` so workspaces can derive runtimes without importing detect-stack.ts.
 */
export async function runStackPipeline(projectRoot: string): Promise<StackPipelineResult> {
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
  ]);

  return {
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
  };
}
