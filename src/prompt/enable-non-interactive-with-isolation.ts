import type { SecurityConfig, IsolationChoice } from '../schema/stack-config.js';
import { promptNonInteractiveHostOsAcceptance } from './non-interactive-host-os-acceptance.js';
import { printHostOsWarning } from './host-os-disclosure.js';

/**
 * Enable non-interactive mode for an already-resolved isolation choice. Used by `update`
 * when the user kept NI enabled but changed isolation — skips the redundant
 * "Enable non-interactive mode?" confirm but still enforces the host-os accept-phrase gate.
 *
 * Prints the host-OS exposure warning before the accept-phrase prompt because this
 * path bypasses `askNonInteractiveMode`'s disclosure render (DRY: same printer that
 * `askIsolation` uses when the user selects host-os).
 */
export async function enableNonInteractiveWithIsolation(
  isolation: IsolationChoice,
): Promise<SecurityConfig> {
  if (isolation === 'host-os') printHostOsWarning();
  return promptNonInteractiveHostOsAcceptance(isolation);
}
