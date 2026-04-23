import { resetWriteSession } from '../generator/index.js';
import { applySafetyFlags } from './safety-flags.js';
import type { SafetyFlags } from './safety-flags.js';

export async function withSafetySession<T>(
  flags: SafetyFlags,
  fn: () => Promise<T>,
): Promise<T> {
  applySafetyFlags(flags);
  try {
    return await fn();
  } finally {
    resetWriteSession();
  }
}
