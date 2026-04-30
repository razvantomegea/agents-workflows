import { configureWriteSession } from '../generator/index.js';
import type { MergeStrategy } from '../generator/index.js';
import { logger } from '../utils/index.js';
import { NonInteractiveFlagsError } from './non-interactive-flags.js';

export interface SafetyFlags {
  yes: boolean;
  noPrompt: boolean;
  mergeStrategy: MergeStrategy | null;
}

export class SafetyFlagsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafetyFlagsError';
  }
}

const VALID_MERGE_STRATEGIES: readonly MergeStrategy[] = ['keep', 'overwrite', 'merge'];

function isMergeStrategy(value: string): value is MergeStrategy {
  return (VALID_MERGE_STRATEGIES as readonly string[]).includes(value);
}

/**
 * Validates and normalises the write-safety CLI flags into a typed `SafetyFlags` value.
 *
 * @param raw - Raw flag values from the CLI option parser.
 * @param raw.yes - Corresponds to `--yes`; when `true` overwrites every existing file.
 * @param raw.noPrompt - Corresponds to `--no-prompt`; when `true` skips existing files and only creates new ones.
 * @param raw.mergeStrategy - Corresponds to `--merge-strategy <keep|overwrite|merge>`; absent maps to `null`.
 *
 * @returns A validated `SafetyFlags` object with defaults applied.
 *
 * @throws `SafetyFlagsError` when:
 *   - `mergeStrategy` is a non-empty string that is not one of `keep | overwrite | merge`.
 *   - `--yes` and `--no-prompt` are both `true` (mutually exclusive).
 *   - `--yes` is combined with `--merge-strategy=keep` (contradictory intent).
 *   - `--no-prompt` is combined with `--merge-strategy=overwrite` or `--merge-strategy=merge` (contradictory intent).
 */
export function parseSafetyFlags(raw: {
  yes?: boolean;
  noPrompt?: boolean;
  mergeStrategy?: string;
}): SafetyFlags {
  const yes = raw.yes ?? false;
  const noPrompt = raw.noPrompt ?? false;
  const rawStrategy = raw.mergeStrategy;

  if (rawStrategy !== undefined && !isMergeStrategy(rawStrategy)) {
    throw new SafetyFlagsError(
      `Invalid --merge-strategy "${rawStrategy}". Must be one of: ${VALID_MERGE_STRATEGIES.join(', ')}.`,
    );
  }

  const mergeStrategy: MergeStrategy | null = rawStrategy ?? null;

  if (yes && noPrompt) {
    throw new SafetyFlagsError('--yes and --no-prompt are mutually exclusive.');
  }

  if (yes && mergeStrategy === 'keep') {
    throw new SafetyFlagsError(
      '--yes (overwrite all) contradicts --merge-strategy=keep (skip all).',
    );
  }

  if (noPrompt && mergeStrategy === 'overwrite') {
    throw new SafetyFlagsError(
      '--no-prompt (skip all) contradicts --merge-strategy=overwrite.',
    );
  }

  if (noPrompt && mergeStrategy === 'merge') {
    throw new SafetyFlagsError(
      '--no-prompt (skip all) contradicts --merge-strategy=merge.',
    );
  }

  return { yes, noPrompt, mergeStrategy };
}

/**
 * Applies validated write-safety flags to the active write session.
 *
 * @param flags - Validated `SafetyFlags` produced by `parseSafetyFlags`.
 *
 * @remarks
 * Side effects: mutates the module-level write-session state in `../generator/index.js`:
 * - `flags.yes === true` → `configureWriteSession({ stickyAll: true })` (overwrite all).
 * - `flags.noPrompt === true` → `configureWriteSession({ stickySkip: true })` (skip all).
 * - `flags.mergeStrategy !== null` → `configureWriteSession({ override: strategy })`.
 * - All flags falsy → no-op.
 * Always call `resetWriteSession` after the write operation to restore defaults.
 */
export function applySafetyFlags(flags: SafetyFlags): void {
  if (flags.yes) {
    configureWriteSession({ stickyAll: true });
    return;
  }

  if (flags.noPrompt) {
    configureWriteSession({ stickySkip: true });
    return;
  }

  if (flags.mergeStrategy !== null) {
    configureWriteSession({ override: flags.mergeStrategy });
  }
}

/**
 * Executes `action`, catching `SafetyFlagsError` and `NonInteractiveFlagsError` to log and exit.
 *
 * @param action - Async callback that performs the CLI command body (e.g., `initCommand`, `updateCommand`).
 *
 * @returns Resolves when `action` completes successfully or after a handled flag error exits the process.
 *
 * @throws Re-throws any error that is not a `SafetyFlagsError` or `NonInteractiveFlagsError`.
 *
 * @remarks
 * Exit-code contract: on `SafetyFlagsError` or `NonInteractiveFlagsError` this function calls
 * `process.exit(1)` and then returns (the return guard after `process.exit` prevents fall-through
 * in test environments where `process.exit` is mocked).
 */
export async function handleSafetyErrors(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof SafetyFlagsError || error instanceof NonInteractiveFlagsError) {
      logger.error(error.message);
      process.exit(1);
      return; // reason: process.exit is mocked in tests — return prevents fall-through to re-throw
    }
    throw error;
  }
}
