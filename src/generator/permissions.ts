import type { StackConfig } from '../schema/stack-config.js';
import type { PostToolUseHook, PreToolUseHook } from './types.js';
import {
  DENY_PATTERNS,
  DESTRUCTIVE_BASH_PATTERNS,
  PRE_TOOL_USE_PATTERN_EXTRAS,
  LOCAL_GIT_ALLOWS,
  TOOLCHAIN_ALLOWS,
} from './permission-constants.js';

export {
  DESTRUCTIVE_BASH_PATTERNS,
  PRE_TOOL_USE_PATTERN_EXTRAS,
  DENY_PATTERNS,
  LOCAL_GIT_ALLOWS,
  TOOLCHAIN_ALLOWS,
} from './permission-constants.js';

export interface PermissionsInput {
  tooling: Pick<StackConfig['tooling'], 'packageManagerPrefix'>;
  commands: Pick<StackConfig['commands'], 'test' | 'typeCheck' | 'lint'>;
}

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
    if (command && !isCoveredByGlob(command, prefix) && !perms.includes(entry)) {
      perms.push(entry);
    }
  }

  return perms;
}

export function buildDenyList(): string[] {
  return [...DENY_PATTERNS];
}

// The hook reads the PreToolUse JSON payload from stdin. Claude Code sends:
// {"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"..."}}
// Exit 2 = block with refusal message; exit 0 = allow.
const PATTERNS_ALTERNATION = [
  ...DESTRUCTIVE_BASH_PATTERNS,
  ...PRE_TOOL_USE_PATTERN_EXTRAS,
].join('|');

const PRE_TOOL_USE_GUARD = [
  '#!/usr/bin/env sh',
  'input=$(cat)',
  'if command -v jq >/dev/null 2>&1; then',
  '  cmd=$(printf \'%s\' "$input" | jq -r \'.tool_input.command // empty\')',
  'elif command -v node >/dev/null 2>&1; then',
  '  cmd=$(printf \'%s\' "$input" | node -e "let data=\'\'; process.stdin.setEncoding(\'utf8\'); process.stdin.on(\'data\', (chunk) => { data += chunk; }); process.stdin.on(\'end\', () => { try { const parsed = JSON.parse(data); const value = parsed?.tool_input?.command; process.stdout.write(typeof value === \'string\' ? value : \'\'); } catch { process.stdout.write(\'\'); } });")',
  'else',
  '  # Escape-aware fallback parser for shells without jq/node.',
  '  cmd=$(printf \'%s\' "$input" | awk \'BEGIN { in_cmd = 0; escaped = 0; out = "" } { for (i = 1; i <= length($0); i++) { ch = substr($0, i, 1); if (!in_cmd) { buffer = buffer ch; if (buffer ~ /"tool_input"[[:space:]]*:[[:space:]]*\\{[^}]*"command"[[:space:]]*:[[:space:]]*"$/) { in_cmd = 1; buffer = "" } else if (length(buffer) > 256) { buffer = substr(buffer, length(buffer) - 255) } } else { if (escaped) { out = out ch; escaped = 0 } else if (ch == "\\\\") { escaped = 1 } else if (ch == "\\"") { print out; exit } else { out = out ch } } } } END { if (!in_cmd) print "" }\')',
  'fi',
  'cmd=$(printf \'%s\' "$cmd" | tr -s \'[:space:]\' \' \')',
  '[ -z "$cmd" ] && exit 0',
  'patterns=' + JSON.stringify(PATTERNS_ALTERNATION),
  'if printf \'%s\' "$cmd" | grep -qE "$patterns"; then',
  '  printf \'%s\\n\' "Blocked: destructive command matched guard pattern." >&2',
  '  exit 2',
  'fi',
  'exit 0',
].join('\n');

export function buildPreToolUseHooks(): readonly PreToolUseHook[] {
  return [
    {
      matcher: 'Bash',
      hooks: [{ type: 'command', command: PRE_TOOL_USE_GUARD }],
    },
  ];
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
