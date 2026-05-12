import { jest } from '@jest/globals';
import { makeStackConfig } from './fixtures.js';
import type { GeneratedFile } from '../../src/generator/types.js';

jest.unstable_mockModule('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

const { readFile } = await import('node:fs/promises');
const { generatePlugins } = await import('../../src/generator/generate-plugins.js');

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

const makeContext = () => ({} as Parameters<typeof generatePlugins>[1]);

describe('generatePlugins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockResolvedValue('# SKILL content' as Awaited<ReturnType<typeof readFile>>);
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
    const paths = files.map((generatedFile: GeneratedFile) => generatedFile.path);
    expect(paths.some((p) => p.includes('brainstorming'))).toBe(true);
    expect(paths.some((p) => p.includes('caveman'))).toBe(true);
  });

  it('reads camelCase plugin selections from their bundled source directories', async () => {
    const config = makeStackConfig({
      plugins: { superpowers: false, caveman: false, claudeMdManagement: true, featureDev: false, codeReviewPlugin: false, codeSimplifier: false },
    });

    await generatePlugins(config, makeContext());

    const readPaths = mockReadFile.mock.calls.map((call) => String(call[0]));
    expect(readPaths.some((readPath) => readPath.includes('/claude-md-management/claude-md-improver/SKILL.md'))).toBe(true);
  });

  it('throws when an enabled plugin skill is missing from the bundle', async () => {
    const missingFileError = Object.assign(new Error('missing'), { code: 'ENOENT' });
    mockReadFile.mockRejectedValue(missingFileError);
    const config = makeStackConfig({
      plugins: { superpowers: false, caveman: true, claudeMdManagement: false, featureDev: false, codeReviewPlugin: false, codeSimplifier: false },
    });

    await expect(generatePlugins(config, makeContext())).rejects.toThrow('Plugin skill missing: caveman/caveman/SKILL.md');
  });

  it('throws when config enables a plugin without installable bundled skills', async () => {
    const config = makeStackConfig({
      plugins: { superpowers: false, caveman: false, claudeMdManagement: false, featureDev: true, codeReviewPlugin: false, codeSimplifier: false },
    });

    await expect(generatePlugins(config, makeContext())).rejects.toThrow('Unsupported plugin selection(s): featureDev');
  });

  it('rethrows unexpected read failures', async () => {
    const permissionError = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    mockReadFile.mockRejectedValue(permissionError);
    const config = makeStackConfig({
      plugins: { superpowers: false, caveman: true, claudeMdManagement: false, featureDev: false, codeReviewPlugin: false, codeSimplifier: false },
    });

    await expect(generatePlugins(config, makeContext())).rejects.toThrow('permission denied');
  });
});
