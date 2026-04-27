import { input } from '@inquirer/prompts';
import type { SecurityConfig, IsolationChoice } from '../schema/stack-config.js';
import { SECURITY_DEFAULTS } from '../schema/stack-config.js';
import { HOST_OS_ACCEPT_PHRASE } from './non-interactive-constants.js';

async function promptHostOsAcceptance(): Promise<boolean> {
  const phrase = await input({ message: `Type '${HOST_OS_ACCEPT_PHRASE}' to continue:` });
  return phrase === HOST_OS_ACCEPT_PHRASE;
}

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
