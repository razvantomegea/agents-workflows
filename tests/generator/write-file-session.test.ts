import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  writeFileSafe,
  configureWriteSession,
  resetWriteSession,
} from '../../src/generator/write-file.js';
import type { MergeFunction } from '../../src/generator/write-file.js';
import { logger } from '../../src/utils/index.js';
import { makePrompt, restorePrompt, createTempDir } from './write-file-helpers.js';

describe('writeFileSafe — session overrides and special cases', () => {
  let tmpDir: string;
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    tmpDir = await createTempDir();
    resetWriteSession();
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    restorePrompt();
    await rm(tmpDir, { recursive: true, force: true });
    warnSpy.mockRestore();
  });

  it('skips without prompt when session override is keep', async () => {
    const prompt = makePrompt('y');
    configureWriteSession({ override: 'keep' });
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'old', 'utf-8');

    const result = await writeFileSafe({ path, content: 'new' });

    expect(result).toEqual({ status: 'skipped', path });
    expect(prompt).not.toHaveBeenCalled();
    await expect(readFile(path, 'utf-8')).resolves.toBe('old');
  });

  it('overwrites without prompt when session override is overwrite', async () => {
    const prompt = makePrompt('n');
    configureWriteSession({ override: 'overwrite' });
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'old', 'utf-8');

    const result = await writeFileSafe({ path, content: 'new' });

    expect(result).toEqual({ status: 'written', path });
    expect(prompt).not.toHaveBeenCalled();
    await expect(readFile(path, 'utf-8')).resolves.toBe('new');
  });

  it('merges without prompt when session override is merge and merge is provided', async () => {
    const prompt = makePrompt('n');
    configureWriteSession({ override: 'merge' });
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'base', 'utf-8');

    const mergeFn: MergeFunction = ({ existing, incoming }) => `${existing}|${incoming}`;
    const result = await writeFileSafe({ path, content: 'patch', merge: mergeFn });

    expect(result).toEqual({ status: 'merged', path });
    expect(prompt).not.toHaveBeenCalled();
    await expect(readFile(path, 'utf-8')).resolves.toBe('base|patch');
  });

  it('falls back to overwrite with a warn when override is merge but no merge fn provided', async () => {
    const prompt = makePrompt('n');
    configureWriteSession({ override: 'merge' });
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'old', 'utf-8');

    const result = await writeFileSafe({ path, content: 'new' });

    expect(result).toEqual({ status: 'written', path });
    expect(prompt).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    await expect(readFile(path, 'utf-8')).resolves.toBe('new');
  });

  it('S4: fallback-overwrite warn message contains merge and overwriting', async () => {
    makePrompt('n');
    configureWriteSession({ override: 'merge' });
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'old', 'utf-8');

    await writeFileSafe({ path, content: 'new' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/merge.*overwriting/i),
    );
  });

  it('S5: existing equals content but merge returns different value returns merged', async () => {
    makePrompt('n');
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'same', 'utf-8');

    const mergeFn: MergeFunction = ({ existing, incoming }) => `${existing}+extra+${incoming}`;
    const result = await writeFileSafe({ path, content: 'same', merge: mergeFn });

    expect(result).toEqual({ status: 'merged', path });
    await expect(readFile(path, 'utf-8')).resolves.toBe('same+extra+same');
  });

  it('S6: stickyAll overwrites even when a merge callback is provided', async () => {
    makePrompt('n');
    configureWriteSession({ stickyAll: true });
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'base', 'utf-8');

    const mergeFn = jest.fn<MergeFunction>(
      ({ existing, incoming }) => `${existing}|${incoming}`,
    );
    const result = await writeFileSafe({ path, content: 'patch', merge: mergeFn });

    expect(result).toEqual({ status: 'written', path });
    expect(mergeFn).not.toHaveBeenCalled();
    await expect(readFile(path, 'utf-8')).resolves.toBe('patch');
  });

  it('resetWriteSession clears sticky state so next call prompts again', async () => {
    makePrompt('s');
    const pathA = join(tmpDir, 'a.md');
    const pathB = join(tmpDir, 'b.md');
    await writeFile(pathA, 'old', 'utf-8');
    await writeFile(pathB, 'old', 'utf-8');

    await writeFileSafe({ path: pathA, content: 'new' });
    resetWriteSession();

    const promptY = makePrompt('y');
    const result = await writeFileSafe({ path: pathB, content: 'new' });

    expect(result.status).toBe('written');
    expect(promptY).toHaveBeenCalledTimes(1);
  });
});
