import { select } from '@inquirer/prompts';
import type { MonorepoInfo } from '../detector/detect-monorepo.js';

export type InstallScope = 'root' | 'per-package' | 'both';

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
