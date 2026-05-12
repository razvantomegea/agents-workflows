import { input } from '@inquirer/prompts';
import type { SecurityConfig, IsolationChoice } from '../schema/stack-config.js';
import { SECURITY_DEFAULTS } from '../schema/stack-config.js';
import { HOST_OS_ACCEPT_PHRASE } from './non-interactive-constants.js';

async function promptHostOsAcceptance(): Promise<boolean> {
  const phrase = await input({ message: `Type '${HOST_OS_ACCEPT_PHRASE}' to continue:` });
  return phrase === HOST_OS_ACCEPT_PHRASE;
}

/**
 * Collects host-OS acceptance for non-interactive mode and returns the resulting `SecurityConfig`.
 *
 * @param isolation - The isolation choice selected by the user (`host-os`, `devcontainer`, etc.).
 *
 * @returns A `SecurityConfig` with `nonInteractiveMode: true` and a fresh `disclosureAcknowledgedAt`
 *   timestamp when acceptance is confirmed (or when `isolation !== 'host-os'`).
 *   Returns security defaults with `nonInteractiveMode: false` when the user does not type the
 *   acceptance phrase for `host-os` isolation.
 *
 * @remarks
 * When `isolation === 'host-os'`, prompts the user to type the exact `HOST_OS_ACCEPT_PHRASE`
 * before proceeding. Any other input results in non-interactive mode remaining disabled.
 */
export async function promptNonInteractiveHostOsAcceptance(
  isolation: IsolationChoice,
): Promise<SecurityConfig> {
  if (isolation === 'host-os') {
    const accepted = await promptHostOsAcceptance();
    if (!accepted) return { ...SECURITY_DEFAULTS, runsIn: isolation };
  }
  return {
    nonInteractiveMode: true,
    runsIn: isolation,
    disclosureAcknowledgedAt: new Date().toISOString(),
  };
}
