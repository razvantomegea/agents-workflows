import type { StackConfig } from '../schema/stack-config.js';
import type { PostToolUseHook, PreToolUseHook } from './types.js';
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

export interface PermissionsInput {
  tooling: Pick<StackConfig['tooling'], 'packageManagerPrefix'>;
  commands: Pick<StackConfig['commands'], 'test' | 'typeCheck' | 'lint'>;
}

const CURRENT_PROJECT_PERMISSIONS: readonly string[] = [
  'Read(./**)',
  'Glob',
  'Grep',
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

export function buildDenyList(): string[] {
  return [...DENY_PATTERNS];
}

// The hook reads the PreToolUse JSON payload from stdin. Claude Code sends:
// {"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"..."}}
// Exit 2 = block with refusal message; exit 0 = allow.

// Anchor each literal pattern at shell token boundaries so separators/operators
// cannot hide destructive commands after a benign command.
const SHELL_TOKEN_BOUNDARY = '[[:space:]]|;|\\||&|\\(|\\)|<|>|\\|\\||&&';

// Anchor each literal pattern at command/word boundaries so short aliases
// (e.g. `irm`, `iwr`) cannot substring-match inside benign words like
// `firmware` or `confirm`. Bundled short flags after destructive literals
// (e.g. `rm -rfv`) are treated as part of the same unsafe token.
function anchorLiteralPattern(value: string): string {
  const bundledShortFlags = /-[A-Za-z]+$/.test(value) ? '[A-Za-z]*' : '';
  return `(^|${SHELL_TOKEN_BOUNDARY})${escapeRegexLiteral(value.toLowerCase())}${bundledShortFlags}(${SHELL_TOKEN_BOUNDARY}|$)`;
}

const PATTERNS_ALTERNATION = [
  ...BASH_DENY_COMMAND_PATTERNS.map(anchorLiteralPattern),
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
  'cmd=$(printf \'%s\' "$cmd" | tr \'[:upper:]\' \'[:lower:]\')',
  'normalized_cmd=$(printf \'%s\' "$cmd" | sed \'s/${ifs}/ /g; s/\\$ifs/ /g; s/\\\\\\([[:alnum:]_.-]\\)/\\1/g\' | tr -d "\'\\"" | tr -s \'[:space:]\' \' \')',
  '[ -z "$cmd" ] && exit 0',
  'patterns=' + JSON.stringify(PATTERNS_ALTERNATION),
  'if printf \'%s\\n%s\' "$cmd" "$normalized_cmd" | grep -qE "$patterns"; then',
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
