import type { StackConfig } from '../schema/stack-config.js';
import type { PostToolUseHook } from './types.js';

export interface PermissionsInput {
  tooling: Pick<StackConfig['tooling'], 'packageManagerPrefix'>;
  commands: Pick<StackConfig['commands'], 'test' | 'typeCheck' | 'lint'>;
}

const DENY_PATTERNS: readonly string[] = [
  'Bash(rm -rf:*)',
  'Bash(rm -r:*)',
  'Bash(rm --recursive:*)',
  'Bash(rm --force:*)',
  'Bash(git push --force:*)',
  'Bash(git push -f:*)',
  'Bash(git push --force-with-lease:*)',
  'Bash(git reset --hard:*)',
  'Bash(git clean -fd:*)',
  'Bash(git clean -f:*)',
  'Bash(git branch -D:*)',
  'Bash(npm publish:*)',
  'Bash(pnpm publish:*)',
  'Bash(cargo publish:*)',
  'Bash(twine upload:*)',
  'Bash(terraform apply:*)',
  'Bash(kubectl apply:*)',
  'Bash(kubectl delete namespace:*)',
  'Edit(.env*)',
  'Edit(**/*.key)',
  'Edit(**/*.pem)',
  'Edit(migrations/**)',
  'Write(.env*)',
  'Write(**/*.key)',
  'Write(**/*.pem)',
  'Write(migrations/**)',
  'MultiEdit(.env*)',
  'MultiEdit(**/*.key)',
  'MultiEdit(**/*.pem)',
  'MultiEdit(migrations/**)',
];

const CURRENT_PROJECT_PERMISSIONS: readonly string[] = [
  'Edit(./**)',
  'MultiEdit(./**)',
  'Write(./**)',
];

export function buildPermissions(input: PermissionsInput): string[] {
  const perms: string[] = [...CURRENT_PROJECT_PERMISSIONS];
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

export function buildDenyList(): string[] {
  return [...DENY_PATTERNS];
}

export function buildPostToolUseHooks(input: { lintCommand: string | null }): PostToolUseHook[] {
  if (!input.lintCommand) return [];
  const cmd = input.lintCommand;
  const hasFix = /(?:^|\s)--fix(?:=|\b)/.test(cmd);
  const usesRunWrapper = /\b(?:npm|yarn|pnpm|bun)\s+run\b/.test(cmd);
  const needsArgumentSeparator = usesRunWrapper && !/\s--(?:\s|$)/.test(cmd);
  const fixArgs = needsArgumentSeparator ? '-- --fix' : '--fix';
  const command = hasFix ? `${cmd} || true` : `${cmd} ${fixArgs} || true`;
  return [{ matcher: 'Edit|MultiEdit|Write', hooks: [{ type: 'command', command }] }];
}

function isCoveredByGlob(command: string, prefix: string | null | undefined): boolean {
  if (!prefix) return false;
  return command === prefix || command.startsWith(`${prefix} `);
}
