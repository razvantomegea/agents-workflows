import { jest } from '@jest/globals';
import { makeStackConfig } from './fixtures.js';

jest.unstable_mockModule('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/file-exists.js', () => ({
  fileExists: jest.fn(),
}));

const { readFile } = await import('node:fs/promises');
const { fileExists } = await import('../../src/utils/file-exists.js');
const { generatePlugins } = await import('../../src/generator/generate-plugins.js');

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;

const makeContext = () => ({} as Parameters<typeof generatePlugins>[1]);

describe('generatePlugins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue('# SKILL content' as Parameters<typeof readFile>[0] extends string ? string : never);
  });

  it('returns empty array when claudeCode target disabled', async () => {
    const config = makeStackConfig({
      targets: { claudeCode: false, codexCli: false, cursor: false, copilot: false, windsurf: false },
      plugins: { superpowers: true, caveman: false, claudeMdManagement: false, featureDev: false, codeReviewPlugin: false, codeSimplifier: false },
    });
    const files = await generatePlugins(config, makeContext());
    expect(files).toHaveLength(0);
  });

  it('returns empty array when no plugins enabled', async () => {
    const config = makeStackConfig();
    const files = await generatePlugins(config, makeContext());
    expect(files).toHaveLength(0);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('emits skill files for enabled plugin', async () => {
    const config = makeStackConfig({
      plugins: { superpowers: true, caveman: false, claudeMdManagement: false, featureDev: false, codeReviewPlugin: false, codeSimplifier: false },
    });
    const files = await generatePlugins(config, makeContext());
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file.path).toMatch(/^\.claude\/skills\/.+\/SKILL\.md$/);
      expect(file.content).toBe('# SKILL content');
    }
  });

  it('emits skills from multiple enabled plugins', async () => {
    const config = makeStackConfig({
      plugins: { superpowers: true, caveman: true, claudeMdManagement: false, featureDev: false, codeReviewPlugin: false, codeSimplifier: false },
    });
    const files = await generatePlugins(config, makeContext());
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.includes('brainstorming'))).toBe(true);
    expect(paths.some((p) => p.includes('caveman'))).toBe(true);
  });

  it('skips skill file when missing (does not throw)', async () => {
    mockFileExists.mockResolvedValue(false);
    const config = makeStackConfig({
      plugins: { superpowers: false, caveman: true, claudeMdManagement: false, featureDev: false, codeReviewPlugin: false, codeSimplifier: false },
    });
    const files = await generatePlugins(config, makeContext());
    expect(files).toHaveLength(0);
    expect(mockReadFile).not.toHaveBeenCalled();
  });
});
