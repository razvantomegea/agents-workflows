import { resetWriteSession } from '../generator/index.js';
import { applySafetyFlags } from './safety-flags.js';
import type { SafetyFlags } from './safety-flags.js';

/**
 * Applies write-safety flags for the duration of `fn`, then unconditionally resets the session.
 *
 * @param flags - Validated `SafetyFlags` to apply before running `fn`.
 * @param fn - Async callback executed inside the scoped write session.
 *
 * @returns The value returned by `fn`.
 *
 * @remarks
 * Side effects: mutates the module-level write-session state in `../generator/index.js` via
 * `applySafetyFlags`, and always restores defaults via `resetWriteSession` in the `finally` block —
 * even when `fn` throws.
 */
export async function withSafetySession<T>(
  flags: SafetyFlags,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    applySafetyFlags(flags);
    return await fn();
  } finally {
    resetWriteSession();
  }
}
