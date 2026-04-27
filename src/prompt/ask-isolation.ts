import { select } from '@inquirer/prompts';
import type { IsolationChoice } from '../schema/stack-config.js';
import { ISOLATION_CHOICES } from '../schema/stack-config.js';
import { printHostOsWarning } from './host-os-disclosure.js';

const ISOLATION_NAME_PAD = Math.max(...ISOLATION_CHOICES.map((choice: IsolationChoice) => choice.length)) + 1;

const ISOLATION_LABELS: Record<IsolationChoice, string> = {
  devcontainer: '.devcontainer / Dev Containers / Codespaces',
  docker: 'other container runtime',
  vm: 'local VM: UTM / Parallels / Hyper-V / WSL2',
  vps: 'remote VM: DigitalOcean / Fly / cloud dev sandbox',
  'clean-machine': 'dedicated workstation — no personal data',
  'host-os': 'my primary OS, with personal files, SSH keys, browser profiles',
};

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

/**
 * Always-asked isolation prompt — captures where the agent runs as a baseline,
 * independent of whether non-interactive mode is enabled.
 *
 * Under `--yes` or when `options.isolation` is set explicitly, returns without prompting.
 * `--yes` preserves `options.current` (existing baseline) so silent reruns don't drop it.
 * When the user picks `host-os`, the read-exposure warning prints (no exact-phrase gate
 * here — that gate fires only when enabling non-interactive mode).
 */
export async function askIsolation(options: AskIsolationOptions): Promise<IsolationChoice | null> {
  if (options.isolation !== undefined) return options.isolation;
  if (options.yes === true) return options.current ?? null;

  const choice = await select<IsolationChoice>({
    message: 'Where are you running the agent? (this affects risk)',
    choices: buildIsolationChoices(),
    default: options.current ?? undefined,
  });

  if (choice === 'host-os') printHostOsWarning();
  return choice;
}
