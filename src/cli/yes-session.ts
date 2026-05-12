import { configureWriteSession, resetWriteSession } from '../generator/index.js';

/**
 * Optionally enables the "overwrite all" write-session mode for the duration of `fn`.
 *
 * @param yes - When `true`, calls `configureWriteSession({ stickyAll: true })` before `fn`
 *   and `resetWriteSession()` after; when `false`, runs `fn` without touching session state.
 * @param fn - Async callback executed inside the conditional write session.
 *
 * @returns The value returned by `fn`.
 *
 * @remarks
 * Side effects: mutates the module-level write-session state in `../generator/index.js`
 * only when `yes === true`. The `finally` block resets session state unconditionally when `yes` was set.
 */
export async function withYesSession<T>(yes: boolean, fn: () => Promise<T>): Promise<T> {
  if (yes) configureWriteSession({ stickyAll: true });
  try {
    return await fn();
  } finally {
    if (yes) resetWriteSession();
  }
}
