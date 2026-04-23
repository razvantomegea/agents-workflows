import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jest } from '@jest/globals';
import { _setPromptFn } from '../../src/generator/write-file.js';
import type { PromptAnswer, PromptFn } from '../../src/generator/write-file.js';

export function makePrompt(answer: PromptAnswer): ReturnType<typeof jest.fn<PromptFn>> {
  const mock = jest.fn<PromptFn>().mockResolvedValue(answer);
  _setPromptFn(mock);
  return mock;
}

export async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'write-file-safe-'));
}
