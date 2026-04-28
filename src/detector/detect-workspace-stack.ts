import { runStackPipeline, resolveRuntime } from './run-stack-pipeline.js';
import { readPackageJson } from '../utils/read-package-json.js';
import { resolveCommands } from '../prompt/commands.js';
import type { WorkspaceStackDetection } from './types.js';

export interface DetectWorkspaceStackOptions {
  workspacePath: string;
  relativePath: string;
}

const JS_LANGUAGES = new Set(['typescript', 'javascript']);

type WorkspaceCommands = WorkspaceStackDetection['commands'];

const LANGUAGE_DEFAULT_COMMANDS: Record<string, WorkspaceCommands> = {
  rust: { typeCheck: 'cargo check', test: 'cargo test', lint: 'cargo clippy', build: 'cargo build' },
  go: { typeCheck: 'go vet ./...', test: 'go test ./...', lint: null, build: 'go build ./...' },
  python: { typeCheck: null, test: 'pytest', lint: null, build: null },
  csharp: { typeCheck: 'dotnet build --no-restore', test: 'dotnet test', lint: null, build: 'dotnet build' },
  java: { typeCheck: null, test: 'mvn test', lint: null, build: 'mvn package' },
};

function resolveWorkspaceCommands(options: {
  packageManager: string | null;
  testFramework: string | null;
  linter: string | null;
  language: string | null;
  scripts: Record<string, string>;
}): WorkspaceCommands {
  const { packageManager, testFramework, linter, language, scripts } = options;

  // Non-JS languages use language-native tool defaults even when a native package manager is detected.
  if (language !== null && !JS_LANGUAGES.has(language.toLowerCase())) {
    return LANGUAGE_DEFAULT_COMMANDS[language.toLowerCase()] ?? {
      typeCheck: null, test: null, lint: null, build: null,
    };
  }

  const resolved = resolveCommands(
    packageManager ?? 'npm',
    testFramework ?? 'jest',
    linter,
    language ?? 'typescript',
    scripts,
  );

  return {
    typeCheck: resolved.typeCheck,
    test: resolved.test,
    lint: resolved.lint,
    build: resolved.build,
  };
}

/**
 * Detects the technology stack for a single workspace directory.
 * Reuses the shared `runStackPipeline` so no detection logic is duplicated.
 *
 * @param options.workspacePath - Absolute path to the workspace directory
 * @param options.relativePath - Relative path from monorepo root (used as `path` in result)
 * @returns WorkspaceStackDetection with language, runtime, framework, packageManager, and commands
 */
export async function detectWorkspaceStack(
  options: DetectWorkspaceStackOptions,
): Promise<WorkspaceStackDetection> {
  const { workspacePath, relativePath } = options;

  const [pipeline, pkg] = await Promise.all([
    runStackPipeline(workspacePath),
    readPackageJson(workspacePath),
  ]);

  const runtime = resolveRuntime(pipeline.language.value, pipeline.framework.value);

  const language = pipeline.language.value;
  const packageManager = pipeline.packageManager.value;
  const testFramework = pipeline.testFramework.value;
  const linter = pipeline.linter.value;
  const scripts = pkg?.scripts ?? {};

  const commands = resolveWorkspaceCommands({ packageManager, testFramework, linter, language, scripts });

  return {
    path: relativePath,
    language,
    runtime: runtime.value,
    framework: pipeline.framework.value,
    packageManager,
    commands,
  };
}
