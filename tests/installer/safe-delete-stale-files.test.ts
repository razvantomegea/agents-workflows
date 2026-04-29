import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const MOCK_CONFIRM = jest.fn<() => Promise<boolean>>();

jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: MOCK_CONFIRM,
  select: jest.fn<() => Promise<string>>(),
  input: jest.fn<() => Promise<string>>(),
  checkbox: jest.fn<() => Promise<string[]>>(),
}));

const { safeDeleteStaleFiles } = await import('../../src/installer/safe-delete-stale-files.js');

async function createStaleFile(
  projectRoot: string,
  relPath: string = '.claude/agents/react-ts-senior.md',
): Promise<string> {
  const absPath = join(projectRoot, relPath);
  await mkdir(join(projectRoot, dirname(relPath)), { recursive: true });
  await writeFile(absPath, 'stale content', 'utf-8');
  return absPath;
}

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

    await expect(readFile(join(projectRoot, '.claude/agents/react-ts-senior.md'), 'utf-8')).rejects.toThrow();
  });

  it('skips candidate that escapes projectRoot', async () => {
    await safeDeleteStaleFiles({
      projectRoot,
      candidates: ['../../outside-file.txt'],
      suppressed: true,
    });

    expect(MOCK_CONFIRM).not.toHaveBeenCalled();
  });

  it('deletes file and writes backup when suppressed is true', async () => {
    const staleRelPath = '.claude/agents/react-ts-senior.md';
    const staleAbsPath = await createStaleFile(projectRoot, staleRelPath);

    await safeDeleteStaleFiles({
      projectRoot,
      candidates: [staleRelPath],
      suppressed: true,
    });

    await expect(readFile(staleAbsPath, 'utf-8')).rejects.toThrow();
    expect(MOCK_CONFIRM).not.toHaveBeenCalled();

    const backupPath = join(projectRoot, '.agents-workflows-backup', staleRelPath);
    const backupContent = await readFile(backupPath, 'utf-8');
    expect(backupContent).toBe('stale content');
  });

  it('keeps file when suppressed is false and user answers no', async () => {
    const staleRelPath = '.claude/agents/react-ts-senior.md';
    const staleAbsPath = await createStaleFile(projectRoot, staleRelPath);

    MOCK_CONFIRM.mockResolvedValueOnce(false);

    await safeDeleteStaleFiles({
      projectRoot,
      candidates: [staleRelPath],
      suppressed: false,
    });

    const content = await readFile(staleAbsPath, 'utf-8');
    expect(content).toBe('stale content');
    await expect(readFile(join(projectRoot, '.agents-workflows-backup', staleRelPath), 'utf-8')).rejects.toThrow();
    expect(MOCK_CONFIRM).toHaveBeenCalledTimes(1);
  });

  it('deletes file when suppressed is false and user confirms yes', async () => {
    const staleRelPath = '.claude/agents/react-ts-senior.md';
    const staleAbsPath = await createStaleFile(projectRoot, staleRelPath);

    MOCK_CONFIRM.mockResolvedValueOnce(true);

    await safeDeleteStaleFiles({
      projectRoot,
      candidates: [staleRelPath],
      suppressed: false,
    });

    await expect(readFile(staleAbsPath, 'utf-8')).rejects.toThrow();
    expect(MOCK_CONFIRM).toHaveBeenCalledTimes(1);
  });
});
