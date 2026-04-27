import { confirm } from '@inquirer/prompts';
import type { SecurityConfig, IsolationChoice } from '../schema/stack-config.js';
import { SECURITY_DEFAULTS } from '../schema/stack-config.js';
import { renderTemplate } from '../utils/template-renderer.js';
import { askIsolation } from './ask-isolation.js';
import { promptNonInteractiveHostOsAcceptance } from './non-interactive-host-os-acceptance.js';
export { HOST_OS_ACCEPT_PHRASE } from './non-interactive-constants.js';

const DISCLOSURE_PARTIAL = 'partials/security-disclosure.md.ejs';

export interface AskNonInteractiveOptions {
  yes?: boolean;
  nonInteractive?: boolean;
  isolation?: IsolationChoice | null;
  acceptRisks?: boolean;
}

function buildResult(params: { nonInteractive: boolean; isolation: IsolationChoice | null }): SecurityConfig {
  if (!params.nonInteractive) {
    return {
      nonInteractiveMode: false,
      runsIn: params.isolation,
      disclosureAcknowledgedAt: null,
    };
  }
  return {
    nonInteractiveMode: true,
    runsIn: params.isolation,
    disclosureAcknowledgedAt: new Date().toISOString(),
  };
}

function resolveNonInteractiveFlagPath(params: {
  nonInteractive: boolean;
  isolation: IsolationChoice | null;
  acceptRisks: boolean | undefined;
}): SecurityConfig {
  const { nonInteractive, isolation, acceptRisks } = params;
  if (!nonInteractive) {
    return { ...SECURITY_DEFAULTS, runsIn: isolation };
  }
  if (isolation === null) {
    return SECURITY_DEFAULTS;
  }
  if (isolation === 'host-os' && acceptRisks !== true) {
    return { ...SECURITY_DEFAULTS, runsIn: isolation };
  }
  return buildResult({ nonInteractive: true, isolation });
}

/**
 * Prompt the user about non-interactive mode, showing the security disclosure
 * before asking for consent. Isolation must be supplied by the caller (typically
 * via askIsolation), since it is asked independently in the new flow.
 *
 * @param options - Options controlling whether to use interactive prompts or honour CLI flags.
 * @returns A SecurityConfig reflecting the user's choice (with `runsIn` set from the supplied isolation).
 */
export async function askNonInteractiveMode(
  options: AskNonInteractiveOptions,
): Promise<SecurityConfig> {
  const { yes, nonInteractive, isolation = null, acceptRisks } = options;

  if (yes === true && nonInteractive === undefined) {
    return { ...SECURITY_DEFAULTS, runsIn: isolation };
  }

  if (nonInteractive !== undefined) {
    return resolveNonInteractiveFlagPath({ nonInteractive, isolation, acceptRisks });
  }

  process.stdout.write(
    'Non-interactive mode lets the agent run without asking for approval on each command. ' +
    'This is faster but carries risks — please read before choosing.\n\n',
  );

  const disclosure = await renderTemplate(DISCLOSURE_PARTIAL, { condense: false });
  process.stdout.write(disclosure + '\n');

  const enabled = await confirm({
    message: 'Enable non-interactive mode for this project?',
    default: false,
  });

  if (!enabled) {
    return { ...SECURITY_DEFAULTS, runsIn: isolation };
  }

  // Isolation must be known before enabling non-interactive. Callers should pass it via
  // askIsolation; if not, fall back to asking inline so this function still works standalone.
  const resolvedIsolation = isolation ?? await askIsolation({});

  if (resolvedIsolation === 'host-os') {
    return promptNonInteractiveHostOsAcceptance(resolvedIsolation);
  }

  return buildResult({ nonInteractive: true, isolation: resolvedIsolation });
}
