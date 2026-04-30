import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileExists, renderUnifiedDiff, logger } from '../utils/index.js';
import {
  session,
  promptFn,
  configureWriteSession,
  resetWriteSession,
  _setPromptFn,
  _restoreDefaultPromptFn,
} from './write-session.js';

export type WriteFileStatus = 'written' | 'skipped' | 'merged' | 'unchanged';

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

export {
  configureWriteSession,
  resetWriteSession,
  _setPromptFn,
  _restoreDefaultPromptFn,
} from './write-session.js';
export type {
  MergeStrategy,
  PromptAnswer,
  PromptFn,
  WriteSession,
} from './write-session.js';

async function performWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
}

/**
 * Writes `content` to `path`, honouring conflict-resolution policies when the
 * file already exists.
 *
 * **Status values** (`WriteFileStatus`):
 * - `'written'` — the file was created (new file) or overwritten (prompt `y`
 *   or `a`, or session `stickyAll`/`override='overwrite'`).
 * - `'skipped'` — an existing file was left untouched (prompt `n` or `s`,
 *   session `stickySkip`/`override='keep'`, or `override='merge'` when no
 *   `merge` function was provided).
 * - `'merged'` — the existing and incoming content were combined by the
 *   supplied `merge` function (prompt `m`, `override='merge'` with a merge
 *   function, or identical content that the merge function transforms).
 * - `'unchanged'` — file already exists with identical content and either no
 *   merge function was provided (idempotent no-op), or a merge function was
 *   provided but returned the same string as the existing content.
 *
 * **Merge-strategy precedence** (highest → lowest):
 * 1. **Sticky flags** — `session.stickyAll` (overwrite everything) or
 *    `session.stickySkip` (skip everything) set via `configureWriteSession`.
 *    Sticky flags are also set mid-run when the user answers `a` or `s`.
 * 2. **Override** — `session.override` (`'keep'`, `'overwrite'`, or `'merge'`)
 *    applies a uniform strategy to every file without prompting.
 * 3. **Interactive prompt** — if neither sticky flag nor override is active, a
 *    diff is printed and the user is asked `y/n/a/s[/m]` for each file.
 *
 * @remarks Mutates module-level session state (via `write-session.ts`) when the
 *   user answers `a` or `s` at the interactive prompt (sets `stickyAll` or
 *   `stickySkip`). Configure non-interactive behaviour in advance via
 *   `configureWriteSession`.
 *
 * @param input - Object containing:
 *   - `path` — absolute or relative destination path.
 *   - `content` — string content to write.
 *   - `merge` — optional merge function; enables the `m` prompt choice and the
 *     `override='merge'` strategy.
 *   - `displayPath` — human-readable path shown in diffs and prompts; defaults
 *     to `path`.
 * @returns A `WriteFileResult` with the resolved `status` and the canonical
 *   `path`.
 * @throws Any filesystem error propagated from `readFile`, `writeFile`, or
 *   `mkdir` (e.g. `EACCES`).
 */
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
    const merged = await merge({ existing, incoming: content, path });
    if (merged === existing) return { status: 'unchanged', path };
    await performWrite(path, merged);
    return { status: 'merged', path };
  }

  if (session.stickyAll) {
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
    await performWrite(path, content);
    return { status: 'written', path };
  }

  if (session.override === 'merge') {
    if (merge != null) {
      const merged = await merge({ existing, incoming: content, path });
      await performWrite(path, merged);
      return { status: 'merged', path };
    }
    logger.warn(`No merge function provided for ${label}; skipping to avoid overwriting.`);
    return { status: 'skipped', path };
  }

  const diff = renderUnifiedDiff({ path: label, before: existing, after: content });
  if (diff) console.log(diff);

  const answer = await promptFn({ path: label, canMerge: merge != null });

  if (answer === 'a') {
    await performWrite(path, content);
    configureWriteSession({ stickyAll: true });
    return { status: 'written', path };
  }

  if (answer === 's') {
    configureWriteSession({ stickySkip: true });
    return { status: 'skipped', path };
  }

  if (answer === 'y') {
    await performWrite(path, content);
    return { status: 'written', path };
  }

  if (answer === 'm' && merge != null) {
    const merged = await merge({ existing, incoming: content, path });
    await performWrite(path, merged);
    return { status: 'merged', path };
  }

  return { status: 'skipped', path };
}
