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

export interface AskNonInteractiveOptions {
  yes?: boolean;
  nonInteractive?: boolean;
  isolation?: IsolationChoice;
  acceptRisks?: boolean;
}

function buildNonInteractiveResult(isolation: IsolationChoice): SecurityConfig {
  return {
    nonInteractiveMode: true,
    runsIn: isolation,
    disclosureAcknowledgedAt: new Date().toISOString(),
  };
}

function resolveNonInteractiveFlagPath(
  nonInteractive: boolean,
  isolation: IsolationChoice | undefined,
  acceptRisks: boolean | undefined,
): SecurityConfig {
  if (!nonInteractive || isolation === undefined) {
    return SECURITY_DEFAULTS;
  }
  if (isolation === 'host-os' && acceptRisks !== true) {
    return SECURITY_DEFAULTS;
  }
  return buildNonInteractiveResult(isolation);
}

async function promptHostOsAcceptance(): Promise<boolean> {
  process.stdout.write('\n' + HOST_OS_WARNING + '\n\n');
  const phrase = await input({ message: `Type '${HOST_OS_ACCEPT_PHRASE}' to continue:` });
  return phrase === HOST_OS_ACCEPT_PHRASE;
}

/**
 * Prompt the user about non-interactive mode, showing the security disclosure before asking for consent.
 *
 * @param options - Options controlling whether to use interactive prompts or honour CLI flags.
 * @returns A SecurityConfig reflecting the user's choice.
 */
export async function askNonInteractiveMode(
  options: AskNonInteractiveOptions,
): Promise<SecurityConfig> {
  const { yes, nonInteractive, isolation, acceptRisks } = options;

  // Defense-in-depth: prompt-flow already short-circuits on --yes, but kept here so direct callers (T3 update-command path) get the same guarantee.
  if (yes === true && nonInteractive === undefined && isolation === undefined) {
    return SECURITY_DEFAULTS;
  }

  if (nonInteractive !== undefined) {
    return resolveNonInteractiveFlagPath(nonInteractive, isolation, acceptRisks);
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
    return SECURITY_DEFAULTS;
  }

  const chosenIsolation = await select<IsolationChoice>({
    message: 'Where are you running the agent? (this affects risk)',
    choices: ISOLATION_CHOICES.map((value) => ({
      value,
      name: `${value.padEnd(ISOLATION_NAME_PAD)} (${ISOLATION_LABELS[value]})`,
    })),
  });

  if (chosenIsolation === 'host-os') {
    const accepted = await promptHostOsAcceptance();
    if (!accepted) {
      return SECURITY_DEFAULTS;
    }
  }

  return buildNonInteractiveResult(chosenIsolation);
}
