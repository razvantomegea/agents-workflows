import type { StackConfig } from '../schema/stack-config.js';
import type { PostToolUseHook } from './types.js';
import {
  ALLOWED_DOMAINS,
  BASH_DENY_COMMAND_PATTERNS,
  CROSS_MODEL_HANDOFF_ALLOWS,
  DENY_PATTERNS,
  escapeRegexLiteral,
  EXPECTED_ALLOWED_DOMAINS_COUNT,
  PRE_TOOL_USE_PATTERN_EXTRAS,
  LOCAL_GIT_ALLOWS,
  SANDBOX_WRAPPER_DENIES,
  SANDBOX_WRAPPER_PREFIXES,
  SHELL_UTILITY_ALLOWS,
  TOOLCHAIN_ALLOWS,
} from './permission-constants.js';

export {
  ALLOWED_DOMAINS,
  BASH_DENY_COMMAND_PATTERNS,
  CROSS_MODEL_HANDOFF_ALLOWS,
  PRE_TOOL_USE_PATTERN_EXTRAS,
  DENY_PATTERNS,
  escapeRegexLiteral,
  EXPECTED_ALLOWED_DOMAINS_COUNT,
  LOCAL_GIT_ALLOWS,
  SANDBOX_WRAPPER_DENIES,
  SANDBOX_WRAPPER_PREFIXES,
  SHELL_UTILITY_ALLOWS,
  TOOLCHAIN_ALLOWS,
} from './permission-constants.js';
export { buildPreToolUseHooks } from './pre-tool-use-hook.js';

export interface PermissionsInput {
  tooling: Pick<StackConfig['tooling'], 'packageManagerPrefix'>;
  commands: Pick<StackConfig['commands'], 'test' | 'typeCheck' | 'lint'>;
}

const CURRENT_PROJECT_PERMISSIONS: readonly string[] = [
  'Read(./**)',
  'Read',
  'Glob',
  'Grep',
  'Edit(./**)',
  'MultiEdit(./**)',
  'Write(./**)',
];

/**
 * Builds the Claude Code `permissions.allow` list for the project.
 *
 * Starts from a fixed baseline of scoped read/write/search permissions for the
 * current project tree, then appends entries derived from the resolved
 * `StackConfig` slices:
 * - `tooling.packageManagerPrefix` — a glob `Bash(<prefix>:*)` covering every
 *   invocation of the configured package manager (e.g. `pnpm`, `npm run`).
 * - `commands.test`, `commands.typeCheck`, `commands.lint` — explicit
 *   `Bash(<cmd>)` entries for commands not already covered by the prefix glob.
 * - `LOCAL_GIT_ALLOWS` — read-only git inspection subcommands.
 * - `TOOLCHAIN_ALLOWS` — non-high-risk toolchain binaries (`tsc`, `jest`, etc.)
 *   not covered by the prefix glob and not flagged as high-risk runtimes.
 * - `CROSS_MODEL_HANDOFF_ALLOWS` — `codex exec` and `claude -p` subprocess
 *   entries (§1.7.2).
 * - `SHELL_UTILITY_ALLOWS` — `ls`, `cd`, `find`, etc.
 * - `buildSandboxWrapperAllows` — WSL-wrapped forms of every explicit Bash allow.
 *
 * @param input - Subset of `StackConfig` containing `tooling.packageManagerPrefix`
 *   and `commands` (`test`, `typeCheck`, `lint`).
 * @returns An ordered array of permission strings suitable for the
 *   `permissions.allow` field of `.claude/settings.json`.
 */
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

  // Local-only git subcommands — git is never covered by a pnpm-style prefix.
  for (const entry of LOCAL_GIT_ALLOWS) {
    if (!perms.includes(entry)) {
      perms.push(entry);
    }
  }

  // Toolchain binaries not covered by the package-manager prefix glob.
  for (const entry of TOOLCHAIN_ALLOWS) {
    // Extract the bare command name, e.g. "tsc" from "Bash(tsc:*)"
    const match = /^Bash\(([^:]+):/.exec(entry);
    const command = match ? match[1] : null;
    const isHighRiskRuntime = command === 'node' || command === 'npx';
    if (command && !isHighRiskRuntime && !isCoveredByGlob(command, prefix) && !perms.includes(entry)) {
      perms.push(entry);
    }
  }

  // Cross-model handoff (§1.7.2): codex exec / claude -p subprocess fallback.
  for (const entry of CROSS_MODEL_HANDOFF_ALLOWS) {
    if (!perms.includes(entry)) {
      perms.push(entry);
    }
  }

  for (const entry of SHELL_UTILITY_ALLOWS) {
    if (!perms.includes(entry)) {
      perms.push(entry);
    }
  }

  // WSL forms of the explicit host Bash allows. Container/devcontainer exec
  // wrappers require a target argument before the inner command; allowing that
  // safely needs configured target names, not a broad wildcard.
  for (const entry of buildSandboxWrapperAllows(perms)) {
    if (!perms.includes(entry)) {
      perms.push(entry);
    }
  }

  return perms;
}

/**
 * Returns the complete Claude Code `permissions.deny` list for the project.
 *
 * The list is sourced directly from the `DENY_PATTERNS` constant in
 * `permission-constants.ts`, which aggregates destructive bash commands,
 * sandbox-wrapper deny entries, and extra patterns (pipe-to-shell, filesystem
 * editors for absolute/home paths, and secret-file globs).
 *
 * @returns An array of deny-pattern strings for the `permissions.deny` field
 *   of `.claude/settings.json`.
 */
export function buildDenyList(): string[] {
  return [...DENY_PATTERNS];
}

/**
 * Builds the PostToolUse hook configuration that runs the project lint command
 * automatically after every file edit (`Edit`, `MultiEdit`, `Write`).
 *
 * If `input.lintCommand` is `null`, no hooks are emitted.  Otherwise a single
 * hook entry is returned that runs the lint command with `--fix` appended (or
 * `-- --fix` when an `npm run`-style wrapper is detected without an existing
 * argument separator).  The command is suffixed with `|| true` so a lint
 * failure does not block the overall tool-use flow.
 *
 * @param input - Object with `lintCommand`: the resolved lint command string, or
 *   `null` to emit no hooks.
 * @returns An array of `PostToolUseHook` entries (empty when no lint command is
 *   configured).
 */
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

function buildSandboxWrapperAllows(hostPermissions: readonly string[]): string[] {
  const wrapperAllows: string[] = [];

  for (const permission of hostPermissions) {
    const innerCommand = extractBashPermissionInnerCommand(permission);
    if (innerCommand === null) continue;

    for (const wrapper of SANDBOX_WRAPPER_PREFIXES) {
      if (wrapper !== 'wsl') continue;
      wrapperAllows.push(`Bash(${wrapper} ${innerCommand})`);
    }
  }

  return wrapperAllows;
}

function extractBashPermissionInnerCommand(permission: string): string | null {
  const match = /^Bash\((.+)\)$/.exec(permission);
  return match?.[1] ?? null;
}
