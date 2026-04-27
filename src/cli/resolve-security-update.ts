import { confirm } from '@inquirer/prompts';
import { askIsolation } from '../prompt/ask-isolation.js';
import { askNonInteractiveMode } from '../prompt/ask-non-interactive.js';
import { enableNonInteractiveWithIsolation } from '../prompt/enable-non-interactive-with-isolation.js';
import {
  SECURITY_DEFAULTS,
  type SecurityConfig,
  type IsolationChoice,
} from '../schema/stack-config.js';
import { parseNonInteractiveFlags } from './non-interactive-flags.js';
import { logger } from '../utils/index.js';

export interface ResolveSecurityUpdateOptions {
  existing: SecurityConfig;
  yes?: boolean;
  noPrompt?: boolean;
  nonInteractive?: boolean;
  isolation?: IsolationChoice;
  acceptRisks?: boolean;
}

/**
 * Resolves the final security config for an `update` run.
 *
 * Four branches (in priority order):
 *  1. Explicit non-interactive flags → validate + honour (may throw NonInteractiveFlagsError).
 *  2. --yes / --no-prompt → preserve existing security verbatim.
 *  3. Currently ON + interactive → remind, ask to keep, also re-confirm isolation.
 *  4. Currently OFF + interactive → ask isolation (always), then ask to enable.
 */
export async function resolveSecurityUpdate(
  options: ResolveSecurityUpdateOptions,
): Promise<SecurityConfig> {
  // Branch 1: explicit flags always win.
  if (
    options.nonInteractive !== undefined ||
    options.isolation !== undefined ||
    options.acceptRisks !== undefined
  ) {
    const parsed = parseNonInteractiveFlags({
      nonInteractive: options.nonInteractive,
      isolation: options.isolation,
      acceptRisks: options.acceptRisks,
    });
    if (!parsed.enabled) {
      return { ...SECURITY_DEFAULTS, runsIn: parsed.isolation };
    }
    return askNonInteractiveMode({
      nonInteractive: true,
      isolation: parsed.isolation,
      acceptRisks: parsed.acceptedHostOsRisk,
    });
  }

  // Branch 2: --yes / --no-prompt → preserve verbatim, no prompts.
  if (options.yes === true || options.noPrompt === true) {
    return options.existing;
  }

  // Branch 3: currently ON → remind, ask to keep, re-confirm isolation.
  if (options.existing.nonInteractiveMode) {
    logger.info(
      `Non-interactive mode is enabled for this project (runsIn=${options.existing.runsIn}, acknowledged=${options.existing.disclosureAcknowledgedAt}). See PRD §1.9.1.`,
    );
    const keep = await confirm({
      message: 'Keep non-interactive mode enabled?',
      default: true,
    });
    const isolation = await askIsolation({ current: options.existing.runsIn });
    if (!keep) {
      return { ...SECURITY_DEFAULTS, runsIn: isolation };
    }
    if (isolation === options.existing.runsIn || isolation === null) {
      // Isolation unchanged (or unspecified) → preserve original disclosure acknowledgement.
      return { ...options.existing, runsIn: isolation ?? options.existing.runsIn };
    }
    // Isolation changed while keeping NI on. Skip the redundant "Enable NI?" confirm
    // (the user already said keep), but still enforce the host-os accept-phrase gate
    // for transitions into host-os; capture a fresh acknowledgement timestamp.
    return enableNonInteractiveWithIsolation(isolation);
  }

  // Branch 4: currently OFF → ask isolation (baseline), then ask to enable.
  const isolation = await askIsolation({ current: options.existing.runsIn });
  const enable = await confirm({
    message: 'Enable non-interactive mode? (advanced — see security disclosure)',
    default: false,
  });
  if (!enable) return { ...SECURITY_DEFAULTS, runsIn: isolation };
  return askNonInteractiveMode({ isolation });
}
