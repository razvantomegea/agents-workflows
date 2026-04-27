import type { SecurityConfig, IsolationChoice } from '../schema/stack-config.js';
import { promptNonInteractiveHostOsAcceptance } from './non-interactive-host-os-acceptance.js';

/**
 * Enable non-interactive mode for an already-resolved isolation choice. Used by `update`
 * when the user kept NI enabled but changed isolation — skips the redundant
 * "Enable non-interactive mode?" confirm but still enforces the host-os accept-phrase gate.
 */
export async function enableNonInteractiveWithIsolation(
  isolation: IsolationChoice,
): Promise<SecurityConfig> {
  return promptNonInteractiveHostOsAcceptance(isolation);
}
