import { select } from '@inquirer/prompts';
import type { MonorepoInfo } from '../detector/detect-monorepo.js';

export type InstallScope = 'root' | 'per-package' | 'both';

/**
 * Prompts the user to choose where to install agent configurations in a monorepo.
 *
 * @param monorepo - Detected monorepo information; when `isMonorepo` is `false` or no workspaces
 *   are found, returns `'root'` immediately without prompting.
 *
 * @returns The selected `InstallScope`: `'root'` (monorepo root only), `'per-package'` (each
 *   workspace only), or `'both'` (root + each workspace).
 *
 * @remarks
 * Skipped under `--yes` / `--no-prompt` / `--non-interactive` — `initCommand` short-circuits
 * to `'root'` without calling this function in those modes.
 */
export async function askInstallScope(monorepo: MonorepoInfo): Promise<InstallScope> {
  if (!monorepo.isMonorepo || monorepo.workspaces.length === 0) {
    return 'root';
  }

  const scope = await select<InstallScope>({
    message: `Detected ${monorepo.workspaces.length} workspace(s) (${monorepo.tool ?? 'monorepo'}). Where should agents-workflows install?`,
    choices: [
      { name: 'Root only — one shared config at the monorepo root', value: 'root' },
      { name: 'Per-package — one config per workspace', value: 'per-package' },
      { name: 'Both — root config + per-workspace configs', value: 'both' },
    ],
    default: 'root',
  });

  return scope;
}
