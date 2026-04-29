import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const MOCK_CONFIRM = jest.fn<() => Promise<boolean>>();

jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: MOCK_CONFIRM,
  select: jest.fn<() => Promise<string>>(),
  input: jest.fn<() => Promise<string>>(),
  checkbox: jest.fn<() => Promise<string[]>>(),
}));

const { safeDeleteStaleFiles } = await import('../../src/installer/safe-delete-stale-files.js');

describe('safeDeleteStaleFiles', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'agents-safe-del-'));
    MOCK_CONFIRM.mockReset();
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('does nothing when candidate file is absent', async () => {
    await safeDeleteStaleFiles({
      projectRoot,
      candidates: ['.claude/agents/react-ts-senior.md'],
      suppressed: true,
    });

    // No file to delete — no error thrown, no backup dir created
    await expect(readFile(join(projectRoot, '.claude/agents/react-ts-senior.md'), 'utf-8')).rejects.toThrow();
  });

  it('deletes file and writes backup when suppressed is true', async () => {
    const staleRelPath = '.claude/agents/react-ts-senior.md';
    const staleAbsPath = join(projectRoot, staleRelPath);
    await mkdir(join(projectRoot, '.claude/agents'), { recursive: true });
    await writeFile(staleAbsPath, 'stale content', 'utf-8');

    await safeDeleteStaleFiles({
      projectRoot,
      candidates: [staleRelPath],
      suppressed: true,
    });

    // File should be deleted
    await expect(readFile(staleAbsPath, 'utf-8')).rejects.toThrow();
    expect(MOCK_CONFIRM).not.toHaveBeenCalled();
  });

  it('keeps file when suppressed is false and user answers no', async () => {
    const staleRelPath = '.claude/agents/react-ts-senior.md';
    const staleAbsPath = join(projectRoot, staleRelPath);
    await mkdir(join(projectRoot, '.claude/agents'), { recursive: true });
    await writeFile(staleAbsPath, 'stale content', 'utf-8');

    MOCK_CONFIRM.mockResolvedValueOnce(false);

    await safeDeleteStaleFiles({
      projectRoot,
      candidates: [staleRelPath],
      suppressed: false,
    });

    // File should still exist
    const content = await readFile(staleAbsPath, 'utf-8');
    expect(content).toBe('stale content');
    await expect(readFile(join(projectRoot, '.agents-workflows-backup', staleRelPath), 'utf-8')).rejects.toThrow();
    expect(MOCK_CONFIRM).toHaveBeenCalledTimes(1);
  });

  it('deletes file when suppressed is false and user confirms yes', async () => {
    const staleRelPath = '.claude/agents/react-ts-senior.md';
    const staleAbsPath = join(projectRoot, staleRelPath);
    await mkdir(join(projectRoot, '.claude/agents'), { recursive: true });
    await writeFile(staleAbsPath, 'stale content', 'utf-8');

    MOCK_CONFIRM.mockResolvedValueOnce(true);

    await safeDeleteStaleFiles({
      projectRoot,
      candidates: [staleRelPath],
      suppressed: false,
    });

    // File should be deleted after confirmation
    await expect(readFile(staleAbsPath, 'utf-8')).rejects.toThrow();
    expect(MOCK_CONFIRM).toHaveBeenCalledTimes(1);
  });
});
