import type { StackConfig } from '../schema/stack-config.js';

export interface PermissionsInput {
  tooling: Pick<StackConfig['tooling'], 'packageManagerPrefix'>;
  commands: Pick<StackConfig['commands'], 'test' | 'typeCheck' | 'lint'>;
}

export function buildPermissions(input: PermissionsInput): string[] {
  const perms: string[] = [];
  const prefix = input.tooling.packageManagerPrefix;
  const glob = prefix ? `Bash(${prefix}:*)` : null;

  if (glob) perms.push(glob);
  perms.push('WebSearch');

  const commandNames = ['test', 'typeCheck', 'lint'] as const;
  for (const name of commandNames) {
    const command = input.commands[name];
    if (command && !isCoveredByGlob(command, prefix)) {
      perms.push(`Bash(${command})`);
    }
  }

  return perms;
}

function isCoveredByGlob(command: string, prefix: string | null | undefined): boolean {
  if (!prefix) return false;
  return command === prefix || command.startsWith(`${prefix} `);
}
