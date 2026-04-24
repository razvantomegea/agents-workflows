import { confirm } from '@inquirer/prompts';

/**
 * Ask the user whether to include repository governance scaffolding.
 *
 * @returns An object with `enabled` set to `true` if the user opts to ship governance files, `false` otherwise.
 */
export async function askGovernance(): Promise<{ enabled: boolean }> {
  const enabled = await confirm({
    message: 'Ship governance scaffolding (.github/pull_request_template.md + docs/GOVERNANCE.md)?',
    default: false,
  });
  return { enabled };
}
