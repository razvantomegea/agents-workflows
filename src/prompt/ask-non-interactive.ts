import { confirm, select, input } from '@inquirer/prompts';
import type { SecurityConfig, IsolationChoice } from '../schema/stack-config.js';
import { SECURITY_DEFAULTS, ISOLATION_CHOICES } from '../schema/stack-config.js';
import { renderTemplate } from '../utils/template-renderer.js';

const ISOLATION_NAME_PAD = Math.max(...ISOLATION_CHOICES.map((c: IsolationChoice) => c.length)) + 1;

export const HOST_OS_ACCEPT_PHRASE = 'yes, I accept the risks' as const;

const DISCLOSURE_PARTIAL = 'partials/security-disclosure.md.ejs';

const ISOLATION_LABELS: Record<IsolationChoice, string> = {
  devcontainer: '.devcontainer / Dev Containers / Codespaces',
  docker: 'other container runtime',
  vm: 'local VM: UTM / Parallels / Hyper-V / WSL2',
  vps: 'remote VM: DigitalOcean / Fly / cloud dev sandbox',
  'clean-machine': 'dedicated workstation — no personal data',
  'host-os': 'my primary OS, with personal files, SSH keys, browser profiles',
};

const HOST_OS_WARNING = [
  'WARNING: Running on your primary OS exposes the following to a prompt-injected agent:',
  '  - ~/.ssh/*',
  '  - ~/.aws/credentials',
  '  - ~/.config/gh/hosts.yml',
  '  - Browser cookie stores',
  '  - Windows %APPDATA%',
  'The workspace-write sandbox restricts WRITES only — reads are unrestricted.',
].join('\n');

export interface AskIsolationOptions {
  yes?: boolean;
  isolation?: IsolationChoice;
  current?: IsolationChoice | null;
}

export interface AskNonInteractiveOptions {
  yes?: boolean;
  nonInteractive?: boolean;
  isolation?: IsolationChoice | null;
  acceptRisks?: boolean;
}

function buildIsolationChoices(): { value: IsolationChoice; name: string }[] {
  return ISOLATION_CHOICES.map((value: IsolationChoice) => ({
    value,
    name: `${value.padEnd(ISOLATION_NAME_PAD)} (${ISOLATION_LABELS[value]})`,
  }));
}

function printHostOsWarning(): void {
  process.stdout.write('\n' + HOST_OS_WARNING + '\n\n');
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
    return SECURITY_DEFAULTS;
  }
  return buildResult({ nonInteractive: true, isolation });
}

async function promptHostOsAcceptance(): Promise<boolean> {
  printHostOsWarning();
  const phrase = await input({ message: `Type '${HOST_OS_ACCEPT_PHRASE}' to continue:` });
  return phrase === HOST_OS_ACCEPT_PHRASE;
}

/**
 * Enable non-interactive mode for an already-resolved isolation choice. Used by `update`
 * when the user kept NI enabled but changed isolation — skips the redundant
 * "Enable non-interactive mode?" confirm but still enforces the host-os accept-phrase gate.
 */
export async function enableNonInteractiveWithIsolation(
  isolation: IsolationChoice,
): Promise<SecurityConfig> {
  if (isolation === 'host-os') {
    const accepted = await promptHostOsAcceptance();
    if (!accepted) return { ...SECURITY_DEFAULTS, runsIn: isolation };
  }
  return buildResult({ nonInteractive: true, isolation });
}

/**
 * Always-asked isolation prompt — captures where the agent runs as a baseline,
 * independent of whether non-interactive mode is enabled.
 *
 * Under `--yes` or when `options.isolation` is set explicitly, returns without prompting.
 * When the user picks `host-os`, the read-exposure warning prints (no exact-phrase gate
 * here — that gate fires only when enabling non-interactive mode).
 */
export async function askIsolation(options: AskIsolationOptions): Promise<IsolationChoice | null> {
  if (options.isolation !== undefined) return options.isolation;
  if (options.yes === true) return null;

  const choice = await select<IsolationChoice>({
    message: 'Where are you running the agent? (this affects risk)',
    choices: buildIsolationChoices(),
    default: options.current ?? undefined,
  });

  if (choice === 'host-os') printHostOsWarning();
  return choice;
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
    const accepted = await promptHostOsAcceptance();
    if (!accepted) return { ...SECURITY_DEFAULTS, runsIn: resolvedIsolation };
  }

  return buildResult({ nonInteractive: true, isolation: resolvedIsolation });
}
