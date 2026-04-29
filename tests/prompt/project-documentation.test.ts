import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { makeDetectedStack } from '../generator/fixtures.js';

interface InputPromptOptions {
  message: string;
  default?: string;
  validate?: (value: string) => true | string;
}

const mockInput = jest.fn<(options: InputPromptOptions) => Promise<string>>();

jest.unstable_mockModule('@inquirer/prompts', () => ({
  input: mockInput,
  confirm: jest.fn<() => Promise<boolean>>(),
  select: jest.fn<() => Promise<string>>(),
  checkbox: jest.fn<() => Promise<string[]>>(),
}));

const { askPaths, askProjectDocumentationFiles, askProjectIdentity } = await import('../../src/prompt/index.js');

describe('project documentation prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses configured defaults and normalizes blank docs and roadmap inputs to null', async () => {
    mockInput
      .mockResolvedValueOnce('   ')
      .mockResolvedValueOnce(' ROADMAP.md ');

    const result = await askProjectDocumentationFiles({
      docsFile: 'README.md',
      roadmapFile: 'PRD.md',
    });

    expect(result).toEqual({
      docsFile: null,
      roadmapFile: 'ROADMAP.md',
    });
    expect(mockInput.mock.calls[0]?.[0].default).toBe('README.md');
    expect(mockInput.mock.calls[1]?.[0].default).toBe('PRD.md');
  });

  it('lets interactive init set docsFile and roadmapFile from detected defaults', async () => {
    const detected = makeDetectedStack({
      docsFile: { value: 'README.md', confidence: 0.95 },
      roadmapFile: { value: 'PRD.md', confidence: 0.95 },
    });
    mockInput
      .mockResolvedValueOnce('demo-app')
      .mockResolvedValueOnce('Demo app')
      .mockResolvedValueOnce('en')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('DOCS.md')
      .mockResolvedValueOnce('ROADMAP.md')
      .mockResolvedValueOnce('trunk');

    const result = await askProjectIdentity(detected);

    expect(result.docsFile).toBe('DOCS.md');
    expect(result.roadmapFile).toBe('ROADMAP.md');
    expect(result.mainBranch).toBe('trunk');
    expect(mockInput.mock.calls[4]?.[0].default).toBe('README.md');
    expect(mockInput.mock.calls[5]?.[0].default).toBe('PRD.md');
  });

  it('validates interactive project descriptions as safe single-line text', async () => {
    const detected = makeDetectedStack();
    mockInput
      .mockResolvedValueOnce('demo-app')
      .mockResolvedValueOnce('Demo app')
      .mockResolvedValueOnce('en')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('main');

    await askProjectIdentity(detected);

    const descriptionValidator = mockInput.mock.calls[1]?.[0].validate;
    expect(descriptionValidator?.('Safe CLI description.')).toBe(true);
    expect(descriptionValidator?.('Safe\n## Override')).not.toBe(true);
    expect(descriptionValidator?.('Use `danger`')).not.toBe(true);
    expect(descriptionValidator?.('Inject <rules>')).not.toBe(true);
  });

  it('trims project structure path prompt values', async () => {
    mockInput
      .mockResolvedValueOnce('app/ ')
      .mockResolvedValueOnce('app/ui/ ')
      .mockResolvedValueOnce('app/lib/ ');

    const result = await askPaths('react');

    expect(result).toEqual({
      sourceRoot: 'app/',
      componentsDir: 'app/ui/',
      utilsDir: 'app/lib/',
    });
  });
});
