import { detectAiAgents } from './detect-ai-agents.js';
import { detectDocsFile } from './detect-docs-file.js';
import { detectRoadmapFile } from './detect-roadmap-file.js';
import { detectMonorepo } from './detect-monorepo.js';
import { detectWorkspaceStack } from './detect-workspace-stack.js';
import { runStackPipeline, resolveRuntime } from './run-stack-pipeline.js';
import { join } from 'node:path';
import type { DetectedStack } from './types.js';

export type { StackPipelineResult } from './run-stack-pipeline.js';
export { runStackPipeline } from './run-stack-pipeline.js';
// resolveRuntime lives in run-stack-pipeline.ts to avoid a cycle; re-exported here for backward compatibility.
export { resolveRuntime } from './run-stack-pipeline.js';

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
 * - `languages` (distinct non-null lowercased languages across root + workspaces)
 * - `workspaceStacks` (per-workspace stack detection results)
 *
 * Each field holds the detector's result (typically a `value` and a `confidence` score) where applicable.
 */
export async function detectStack(projectRoot: string): Promise<DetectedStack> {
  const [pipeline, aiAgents, docsFile, roadmapFile, monorepo] = await Promise.all([
    runStackPipeline(projectRoot),
    detectAiAgents(),
    detectDocsFile(projectRoot),
    detectRoadmapFile(projectRoot),
    detectMonorepo(projectRoot),
  ]);

  const runtime = resolveRuntime(pipeline.language.value, pipeline.framework.value);

  const workspaceStacks = monorepo.workspaces.length > 0
    ? await Promise.all(
        monorepo.workspaces.map((workspace) =>
          detectWorkspaceStack({ workspacePath: join(projectRoot, workspace), relativePath: workspace }),
        ),
      )
    : [];

  const languages = workspaceStacks.length > 0
    ? aggregateLanguages(pipeline.language.value, workspaceStacks)
    : [];

  return {
    language: pipeline.language,
    runtime,
    framework: pipeline.framework,
    uiLibrary: pipeline.uiLibrary,
    stateManagement: pipeline.stateManagement,
    database: pipeline.database,
    auth: pipeline.auth,
    i18n: pipeline.i18n,
    testFramework: pipeline.testFramework,
    testLibrary: pipeline.testLibrary,
    e2eFramework: pipeline.e2eFramework,
    linter: pipeline.linter,
    formatter: pipeline.formatter,
    packageManager: pipeline.packageManager,
    monorepo,
    aiAgents,
    docsFile,
    roadmapFile,
    languages,
    workspaceStacks,
  };
}

// Returns [] when all workspaces share a single language (monolingual monorepo).
// Only polyglot monorepos (2+ distinct languages) return a non-empty list.
export function aggregateLanguages(
  rootLanguage: string | null,
  workspaceStacks: readonly { language: string | null }[],
): readonly string[] {
  const all = [rootLanguage, ...workspaceStacks.map((ws) => ws.language)];
  const nonNull = all.filter((lang): lang is string => lang !== null);
  const distinct = Array.from(new Set(nonNull.map((lang) => lang.toLowerCase())));
  return distinct.length <= 1 ? [] : distinct;
}

export { detectMonorepo } from './detect-monorepo.js';
