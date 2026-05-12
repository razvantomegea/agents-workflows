export type MergeStrategy = 'keep' | 'overwrite' | 'merge';

export type PromptAnswer = 'y' | 'n' | 'a' | 's' | 'm';

export type PromptFn = (args: {
  path: string;
  canMerge: boolean;
}) => Promise<PromptAnswer>;

export interface WriteSession {
  stickyAll: boolean;
  stickySkip: boolean;
  override: MergeStrategy | null;
}

export const DEFAULT_SESSION: WriteSession = {
  stickyAll: false,
  stickySkip: false,
  override: null,
};

export let session: WriteSession = { ...DEFAULT_SESSION };

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

export const DEFAULT_PROMPT_FN: PromptFn = defaultPromptFn;
export let promptFn: PromptFn = DEFAULT_PROMPT_FN;

/**
 * Applies a partial update to the module-level write session.
 *
 * Merges `partial` into the current session so callers can pre-configure
 * `stickyAll`, `stickySkip`, or `override` before a batch of
 * {@link writeFileSafe} calls.
 *
 * @remarks Mutates module-level session state. Call `resetWriteSession` to
 *   restore defaults between independent runs.
 *
 * @param partial - One or more `WriteSession` fields to overwrite in the
 *   current session.
 */
export function configureWriteSession(partial: Partial<WriteSession>): void {
  session = { ...session, ...partial };
}

/**
 * Resets the module-level write session to its default state.
 *
 * After calling this function `stickyAll`, `stickySkip`, and `override` are
 * all cleared, so the next {@link writeFileSafe} call will prompt
 * interactively for any conflicting file.
 *
 * @remarks Mutates module-level session state.
 */
export function resetWriteSession(): void {
  session = { ...DEFAULT_SESSION };
}

/**
 * Replaces the module-level prompt function used by {@link writeFileSafe}.
 *
 * Intended for tests that need to simulate user answers without spawning an
 * interactive TTY.
 *
 * @param fn - Replacement prompt function.
 */
export function _setPromptFn(fn: PromptFn): void {
  promptFn = fn;
}

/**
 * Restores the module-level prompt function to the default interactive
 * `@inquirer/prompts` implementation.
 *
 * Call after a test suite that replaced the prompt via `_setPromptFn`.
 */
export function _restoreDefaultPromptFn(): void {
  promptFn = DEFAULT_PROMPT_FN;
}
