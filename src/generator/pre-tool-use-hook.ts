import type { PreToolUseHook } from './types.js';
import {
  BASH_DENY_COMMAND_PATTERNS,
  PRE_TOOL_USE_PATTERN_EXTRAS,
  escapeRegexLiteral,
} from './permission-constants.js';

const SHELL_TOKEN_BOUNDARY = '[[:space:]]|;|\\||&|\\(|\\)|<|>|\\|\\||&&';

/**
 * Wraps a plain command literal in an ERE anchor so that shell token
 * separators (`;`, `|`, `&&`, etc.) cannot hide the literal after a benign
 * prefix, and so that short flags bundled to a destructive command
 * (e.g. `rm -rfv`) are also matched.
 *
 * @param value - A literal command string from `BASH_DENY_COMMAND_PATTERNS`.
 * @returns An ERE fragment anchored at shell token boundaries.
 */
function anchorLiteralPattern(value: string): string {
  const bundledShortFlags = /-[A-Za-z]+$/.test(value) ? '[A-Za-z]*' : '';
  return `(^|${SHELL_TOKEN_BOUNDARY})${escapeRegexLiteral(value.toLowerCase())}${bundledShortFlags}(${SHELL_TOKEN_BOUNDARY}|$)`;
}

const PATTERNS_ALTERNATION = [
  ...BASH_DENY_COMMAND_PATTERNS.map(anchorLiteralPattern),
  ...PRE_TOOL_USE_PATTERN_EXTRAS,
].join('|');

/**
 * POSIX sh script that Claude Code runs as a PreToolUse hook for every Bash
 * invocation.  It reads the tool-call JSON payload from stdin, extracts the
 * `tool_input.command` value using `jq` (primary), `node` (fallback), or an
 * AWK fallback, normalises whitespace and case, and exits with code 2 (block)
 * if the command matches any pattern in `PATTERNS_ALTERNATION`.
 *
 * @internal Exposed only so tests can assert its shell-script contents.
 */
export const PRE_TOOL_USE_GUARD: string = [
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

/**
 * Builds the PreToolUse hook configuration that Claude Code installs for every
 * Bash invocation.
 *
 * The hook is a POSIX sh script (`PRE_TOOL_USE_GUARD`) that blocks Bash
 * commands matching any pattern derived from `BASH_DENY_COMMAND_PATTERNS` plus
 * `PRE_TOOL_USE_PATTERN_EXTRAS`.  It normalises the command to lowercase and
 * strips quoting before matching so trivial obfuscation attempts are also
 * blocked.
 *
 * @returns An array containing a single `PreToolUseHook` entry that applies to
 *   all `Bash` tool calls.
 */
export function buildPreToolUseHooks(): readonly PreToolUseHook[] {
  return [
    {
      matcher: 'Bash',
      hooks: [{ type: 'command', command: PRE_TOOL_USE_GUARD }],
    },
  ];
}
