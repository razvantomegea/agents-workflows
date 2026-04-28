import { filterDetectedByWorkspacePaths } from '../../src/cli/filter-detected-by-paths.js';
import type { DetectedStack } from '../../src/detector/types.js';

const EMPTY_DETECTION = { value: null, confidence: 0 };

function makeDetectedStack(workspacePaths: string[]): DetectedStack {
  return {
    language: EMPTY_DETECTION,
    runtime: EMPTY_DETECTION,
    framework: EMPTY_DETECTION,
    uiLibrary: EMPTY_DETECTION,
    stateManagement: EMPTY_DETECTION,
    database: EMPTY_DETECTION,
    auth: EMPTY_DETECTION,
    i18n: EMPTY_DETECTION,
    testFramework: EMPTY_DETECTION,
    testLibrary: EMPTY_DETECTION,
    e2eFramework: EMPTY_DETECTION,
    linter: EMPTY_DETECTION,
    formatter: EMPTY_DETECTION,
    packageManager: EMPTY_DETECTION,
    monorepo: { isMonorepo: false, tool: null, workspaces: [] },
    aiAgents: { agents: [], hasClaudeCode: false, hasCodexCli: false },
    docsFile: EMPTY_DETECTION,
    roadmapFile: EMPTY_DETECTION,
    languages: [],
    workspaceStacks: workspacePaths.map((path) => ({
      path,
      language: 'typescript',
      runtime: 'node',
      framework: null,
      packageManager: 'pnpm',
      commands: { typeCheck: null, test: null, lint: null, build: null },
    })),
  };
}

describe('filterDetectedByWorkspacePaths', () => {
  it('returns all workspaces when all paths are selected', () => {
    const detected = makeDetectedStack(['apps/web', 'apps/api']);
    const result = filterDetectedByWorkspacePaths(detected, ['apps/web', 'apps/api']);
    expect(result.workspaceStacks).toHaveLength(2);
  });

  it('filters out deselected workspace paths', () => {
    const detected = makeDetectedStack(['apps/web', 'apps/api', 'services/worker']);
    const result = filterDetectedByWorkspacePaths(detected, ['apps/api']);
    expect(result.workspaceStacks).toHaveLength(1);
    expect(result.workspaceStacks[0].path).toBe('apps/api');
  });

  it('returns empty workspaceStacks when no paths are selected', () => {
    const detected = makeDetectedStack(['apps/web', 'apps/api']);
    const result = filterDetectedByWorkspacePaths(detected, []);
    expect(result.workspaceStacks).toHaveLength(0);
  });

  it('preserves non-workspace DetectedStack fields unchanged after filtering', () => {
    const detected = makeDetectedStack(['apps/web']);
    const result = filterDetectedByWorkspacePaths(detected, []);
    // Fields that should be preserved by reference
    expect(result.monorepo).toBe(detected.monorepo);
    expect(result.aiAgents).toBe(detected.aiAgents);
    expect(result.language).toBe(detected.language);
    expect(result.runtime).toBe(detected.runtime);
    expect(result.framework).toBe(detected.framework);
  });

  it('recomputes languages from filtered stacks — monolingual after filtering returns []', () => {
    // All three workspaces have language 'typescript', so aggregateLanguages returns []
    // (all same language = monolingual monorepo, not polyglot).
    const detected = makeDetectedStack(['apps/web', 'services/api', 'crates/core']);
    // Manually set different languages to simulate a polyglot scenario.
    detected.workspaceStacks[1].language = 'python';
    detected.workspaceStacks[2].language = 'rust';
    // languages pre-filter: ['typescript', 'python', 'rust']
    (detected as { languages: readonly string[] }).languages = ['typescript', 'python', 'rust'];

    // Filter to just the TS workspace.
    const result = filterDetectedByWorkspacePaths(detected, ['apps/web']);

    expect(result.workspaceStacks).toHaveLength(1);
    // After filtering, only 'typescript' workspace remains. Root language is null
    // (EMPTY_DETECTION.value = null). aggregateLanguages(null, [{language:'typescript'}])
    // returns [] because there is only one distinct language.
    expect(result.languages).toEqual([]);
  });

  it('returns polyglot languages when multiple languages remain after filtering', () => {
    const detected = makeDetectedStack(['apps/web', 'services/api']);
    detected.workspaceStacks[0].language = 'typescript';
    detected.workspaceStacks[1].language = 'python';
    (detected as { languages: readonly string[] }).languages = ['typescript', 'python'];

    // Keep both workspaces selected.
    const result = filterDetectedByWorkspacePaths(detected, ['apps/web', 'services/api']);

    // Root language is null; two distinct workspace languages → polyglot.
    expect(result.languages).toEqual(['typescript', 'python']);
  });

  it('handles an empty workspaceStacks input gracefully', () => {
    const detected = makeDetectedStack([]);
    const result = filterDetectedByWorkspacePaths(detected, ['apps/web']);
    expect(result.workspaceStacks).toHaveLength(0);
  });
});
