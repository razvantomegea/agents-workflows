import { confirm } from '@inquirer/prompts';
import { askNonInteractiveMode } from '../prompt/ask-non-interactive.js';
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
 *  3. Currently ON + interactive → remind user, ask to keep.
 *  4. Currently OFF + interactive → ask to enable (full disclosure flow on accept).
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
    if (!parsed.enabled) return SECURITY_DEFAULTS;
    return askNonInteractiveMode({
      nonInteractive: true,
      isolation: parsed.isolation ?? undefined,
      acceptRisks: parsed.acceptedHostOsRisk,
    });
  }

  // Branch 2: --yes / --no-prompt → preserve verbatim, no prompts.
  if (options.yes === true || options.noPrompt === true) {
    return options.existing;
  }

  // Branch 3: currently ON → remind + ask to keep.
  if (options.existing.nonInteractiveMode) {
    logger.info(
      `Non-interactive mode is enabled for this project (runsIn=${options.existing.runsIn}, acknowledged=${options.existing.disclosureAcknowledgedAt}). See PRD §1.9.1.`,
    );
    const keep = await confirm({
      message: 'Keep non-interactive mode enabled?',
      default: true,
    });
    return keep ? options.existing : { ...SECURITY_DEFAULTS };
  }

  // Branch 4: currently OFF → ask to enable.
  const enable = await confirm({
    message: 'Enable non-interactive mode? (advanced — see security disclosure)',
    default: false,
  });
  if (!enable) return SECURITY_DEFAULTS;
  return askNonInteractiveMode({});
}
