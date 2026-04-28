import { jest } from '@jest/globals';
import type { DetectedStack } from '../../src/detector/types.js';
import type { AskWorkspaceSelectionOptions } from '../../src/prompt/ask-workspace-selection.js';

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

const mockAskWorkspaceSelection = jest.fn<
  (options: AskWorkspaceSelectionOptions) => Promise<string[]>
>();

jest.unstable_mockModule('../../src/prompt/ask-workspace-selection.js', () => ({
  askWorkspaceSelection: mockAskWorkspaceSelection,
}));

const { resolveWorkspaceSelection } = await import(
  '../../src/prompt/resolve-workspace-selection.js'
);

describe('resolveWorkspaceSelection', () => {
  beforeEach(() => mockAskWorkspaceSelection.mockReset());

  it('returns empty array immediately when no workspaces are detected', async () => {
    const detected = makeDetectedStack([]);
    const result = await resolveWorkspaceSelection({ detected, yes: false, noPrompt: false });
    expect(result).toEqual([]);
    expect(mockAskWorkspaceSelection).not.toHaveBeenCalled();
  });

  it('returns all paths without prompting when yes is true', async () => {
    const detected = makeDetectedStack(['apps/web', 'apps/api']);
    const result = await resolveWorkspaceSelection({ detected, yes: true, noPrompt: false });
    expect(result).toEqual(['apps/web', 'apps/api']);
    expect(mockAskWorkspaceSelection).not.toHaveBeenCalled();
  });

  it('returns all paths without prompting when noPrompt is true', async () => {
    const detected = makeDetectedStack(['services/worker']);
    const result = await resolveWorkspaceSelection({ detected, yes: false, noPrompt: true });
    expect(result).toEqual(['services/worker']);
    expect(mockAskWorkspaceSelection).not.toHaveBeenCalled();
  });

  it('delegates to askWorkspaceSelection when interactive', async () => {
    mockAskWorkspaceSelection.mockResolvedValue(['apps/web']);
    const detected = makeDetectedStack(['apps/web', 'apps/api']);
    const result = await resolveWorkspaceSelection({ detected, yes: false, noPrompt: false });
    expect(result).toEqual(['apps/web']);
    expect(mockAskWorkspaceSelection).toHaveBeenCalledWith({ detected });
  });
});
