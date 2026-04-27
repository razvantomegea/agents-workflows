import { select } from '@inquirer/prompts';
import type { IsolationChoice } from '../schema/stack-config.js';
import { ISOLATION_CHOICES } from '../schema/stack-config.js';

const ISOLATION_NAME_PAD = Math.max(...ISOLATION_CHOICES.map((choice: IsolationChoice) => choice.length)) + 1;

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

function buildIsolationChoices(): { value: IsolationChoice; name: string }[] {
  return ISOLATION_CHOICES.map((value: IsolationChoice) => ({
    value,
    name: `${value.padEnd(ISOLATION_NAME_PAD)} (${ISOLATION_LABELS[value]})`,
  }));
}

function printHostOsWarning(): void {
  process.stdout.write('\n' + HOST_OS_WARNING + '\n\n');
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
