import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileExists } from '../utils/index.js';
import { renderUnifiedDiff } from '../utils/index.js';
import { logger } from '../utils/index.js';

export type WriteFileStatus = 'written' | 'skipped' | 'merged' | 'unchanged';
export type MergeStrategy = 'keep' | 'overwrite' | 'merge';

export type MergeFunction = (args: {
  existing: string;
  incoming: string;
  path: string;
}) => string | Promise<string>;

export interface WriteFileInput {
  path: string;
  content: string;
  merge?: MergeFunction;
  displayPath?: string;
}

export interface WriteFileResult {
  status: WriteFileStatus;
  path: string;
}

export type PromptAnswer = 'y' | 'n' | 'a' | 's' | 'm';

export type PromptFn = (args: {
  path: string;
  canMerge: boolean;
}) => Promise<PromptAnswer>;

interface WriteSession {
  stickyAll: boolean;
  stickySkip: boolean;
  override: MergeStrategy | null;
}

const DEFAULT_SESSION: WriteSession = {
  stickyAll: false,
  stickySkip: false,
  override: null,
};

let session: WriteSession = { ...DEFAULT_SESSION };

const DEFAULT_PROMPT_FN: PromptFn = defaultPromptFn;
let promptFn: PromptFn = DEFAULT_PROMPT_FN;

export function configureWriteSession(partial: Partial<WriteSession>): void {
  session = { ...session, ...partial };
}

export function resetWriteSession(): void {
  session = { ...DEFAULT_SESSION };
}

export function _setPromptFn(fn: PromptFn): void {
  promptFn = fn;
}

export function _restoreDefaultPromptFn(): void {
  promptFn = DEFAULT_PROMPT_FN;
}

async function defaultPromptFn({ path, canMerge }: { path: string; canMerge: boolean }): Promise<PromptAnswer> {
  const { select } = await import('@inquirer/prompts');
  const choices: Array<{ name: string; value: PromptAnswer }> = [
    { name: '[y] Overwrite this file', value: 'y' },
    { name: '[n] Keep existing (skip this file)', value: 'n' },
    { name: '[a] Overwrite all remaining', value: 'a' },
    { name: '[s] Skip all remaining', value: 's' },
  ];
  if (canMerge) {
    choices.push({ name: '[m] Merge', value: 'm' });
  }
  return select<PromptAnswer>({
    message: `File already exists: ${path}. What do you want to do?`,
    default: 'n',
    choices,
  });
}

async function performWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
}

async function applyMerge(
  mergeFn: MergeFunction,
  existing: string,
  incoming: string,
  path: string,
): Promise<string> {
  return mergeFn({ existing, incoming, path });
}

export async function writeFileSafe(input: WriteFileInput): Promise<WriteFileResult> {
  const { path, content, merge, displayPath } = input;
  const label = displayPath ?? path;

  if (!(await fileExists(path))) {
    await performWrite(path, content);
    return { status: 'written', path };
  }

  const existing = await readFile(path, 'utf-8');

  if (existing === content && merge == null) {
    return { status: 'unchanged', path };
  }

  if (existing === content && merge != null) {
    const merged = await applyMerge(merge, existing, content, path);
    if (merged === existing) return { status: 'unchanged', path };
    await performWrite(path, merged);
    return { status: 'merged', path };
  }

  if (session.stickyAll) {
    if (merge != null) {
      const merged = await applyMerge(merge, existing, content, path);
      await performWrite(path, merged);
      return { status: 'merged', path };
    }
    await performWrite(path, content);
    return { status: 'written', path };
  }

  if (session.stickySkip) {
    return { status: 'skipped', path };
  }

  if (session.override === 'keep') {
    return { status: 'skipped', path };
  }

  if (session.override === 'overwrite') {
    if (merge != null) {
      const merged = await applyMerge(merge, existing, content, path);
      await performWrite(path, merged);
      return { status: 'merged', path };
    }
    await performWrite(path, content);
    return { status: 'written', path };
  }

  if (session.override === 'merge') {
    if (merge != null) {
      const merged = await applyMerge(merge, existing, content, path);
      await performWrite(path, merged);
      return { status: 'merged', path };
    }
    logger.warn(`No merge function provided for ${label}; overwriting instead.`);
    await performWrite(path, content);
    return { status: 'written', path };
  }

  const diff = renderUnifiedDiff({ path: label, before: existing, after: content });
  if (diff) console.log(diff);

  const answer = await promptFn({ path: label, canMerge: merge != null });

  if (answer === 'a') {
    session = { ...session, stickyAll: true };
    await performWrite(path, content);
    return { status: 'written', path };
  }

  if (answer === 's') {
    session = { ...session, stickySkip: true };
    return { status: 'skipped', path };
  }

  if (answer === 'y') {
    await performWrite(path, content);
    return { status: 'written', path };
  }

  if (answer === 'm' && merge != null) {
    const merged = await applyMerge(merge, existing, content, path);
    await performWrite(path, merged);
    return { status: 'merged', path };
  }

  return { status: 'skipped', path };
}
