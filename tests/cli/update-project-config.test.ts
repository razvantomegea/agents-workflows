import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { StackConfig } from '../../src/schema/stack-config.js';

interface InputPromptOptions {
  message: string;
  default?: string;
}

const mockInput = jest.fn<(options: InputPromptOptions) => Promise<string>>();

jest.unstable_mockModule('@inquirer/prompts', () => ({
  input: mockInput,
  confirm: jest.fn<() => Promise<boolean>>(),
  select: jest.fn<() => Promise<string>>(),
  checkbox: jest.fn<() => Promise<string[]>>(),
}));

const { resolveUpdateProjectConfig } = await import('../../src/cli/update-command.js');

const EXISTING_PROJECT: StackConfig['project'] = {
  name: 'demo-app',
  description: 'Demo app',
  locale: 'en',
  localeRules: [],
  docsFile: 'README.md',
  roadmapFile: 'PRD.md',
  mainBranch: 'main',
};

describe('resolveUpdateProjectConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves manifest project values when prompts are suppressed', async () => {
    const result = await resolveUpdateProjectConfig({
      existing: EXISTING_PROJECT,
      promptsSuppressed: true,
    });

    expect(result).toBe(EXISTING_PROJECT);
    expect(mockInput).not.toHaveBeenCalled();
  });

  it('applies interactive docsFile, roadmapFile, and mainBranch prompt values', async () => {
    mockInput
      .mockResolvedValueOnce('DOCS.md')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('develop');

    const result = await resolveUpdateProjectConfig({
      existing: EXISTING_PROJECT,
      promptsSuppressed: false,
    });

    expect(result).toEqual({
      ...EXISTING_PROJECT,
      docsFile: 'DOCS.md',
      roadmapFile: null,
      mainBranch: 'develop',
    });
    expect(mockInput.mock.calls[0]?.[0].default).toBe('README.md');
    expect(mockInput.mock.calls[1]?.[0].default).toBe('PRD.md');
    expect(mockInput.mock.calls[2]?.[0].default).toBe('main');
  });
});
