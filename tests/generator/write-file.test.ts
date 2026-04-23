import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  writeFileSafe,
  resetWriteSession,
} from '../../src/generator/write-file.js';
import type { MergeFunction } from '../../src/generator/write-file.js';
import { makePrompt, createTempDir } from './write-file-helpers.js';

describe('writeFileSafe — basic write behaviors', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTempDir();
    resetWriteSession();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes a non-existent file without prompting', async () => {
    const prompt = makePrompt('n');
    const path = join(tmpDir, 'new.md');

    const result = await writeFileSafe({ path, content: 'hello' });

    expect(result).toEqual({ status: 'written', path });
    await expect(readFile(path, 'utf-8')).resolves.toBe('hello');
    expect(prompt).not.toHaveBeenCalled();
  });

  it('returns unchanged when content is identical', async () => {
    const prompt = makePrompt('y');
    const path = join(tmpDir, 'same.md');
    await writeFile(path, 'same', 'utf-8');

    const result = await writeFileSafe({ path, content: 'same' });

    expect(result).toEqual({ status: 'unchanged', path });
    expect(prompt).not.toHaveBeenCalled();
  });

  it('overwrites when prompt answer is y', async () => {
    makePrompt('y');
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'old', 'utf-8');

    const result = await writeFileSafe({ path, content: 'new' });

    expect(result).toEqual({ status: 'written', path });
    await expect(readFile(path, 'utf-8')).resolves.toBe('new');
  });

  it('skips when prompt answer is n', async () => {
    makePrompt('n');
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'original', 'utf-8');

    const result = await writeFileSafe({ path, content: 'changed' });

    expect(result).toEqual({ status: 'skipped', path });
    await expect(readFile(path, 'utf-8')).resolves.toBe('original');
  });

  it('sets sticky-all when answer is a and subsequent files write without prompt', async () => {
    const prompt = makePrompt('a');
    const pathA = join(tmpDir, 'a.md');
    const pathB = join(tmpDir, 'b.md');
    await writeFile(pathA, 'old-a', 'utf-8');
    await writeFile(pathB, 'old-b', 'utf-8');

    const resultA = await writeFileSafe({ path: pathA, content: 'new-a' });
    expect(resultA.status).toBe('written');

    const resultB = await writeFileSafe({ path: pathB, content: 'new-b' });
    expect(resultB.status).toBe('written');
    expect(prompt).toHaveBeenCalledTimes(1);
    await expect(readFile(pathB, 'utf-8')).resolves.toBe('new-b');
  });

  it('sets sticky-skip when answer is s and subsequent files skip without prompt', async () => {
    const prompt = makePrompt('s');
    const pathA = join(tmpDir, 'a.md');
    const pathB = join(tmpDir, 'b.md');
    await writeFile(pathA, 'old-a', 'utf-8');
    await writeFile(pathB, 'old-b', 'utf-8');

    const resultA = await writeFileSafe({ path: pathA, content: 'new-a' });
    expect(resultA.status).toBe('skipped');

    const resultB = await writeFileSafe({ path: pathB, content: 'new-b' });
    expect(resultB.status).toBe('skipped');
    expect(prompt).toHaveBeenCalledTimes(1);
    await expect(readFile(pathB, 'utf-8')).resolves.toBe('old-b');
  });

  it('calls merge callback and writes result when prompt answer is m', async () => {
    makePrompt('m');
    const path = join(tmpDir, 'file.md');
    await writeFile(path, 'existing', 'utf-8');

    const mergeFn: MergeFunction = ({ existing, incoming }) => `${existing}+${incoming}`;
    const result = await writeFileSafe({ path, content: 'incoming', merge: mergeFn });

    expect(result).toEqual({ status: 'merged', path });
    await expect(readFile(path, 'utf-8')).resolves.toBe('existing+incoming');
  });
});
