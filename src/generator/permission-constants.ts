/**
 * Source-of-truth constants for Claude Code permission deny/allow lists and
 * pre-tool-use guard patterns. Import from permissions.ts — do not import
 * this file directly from outside the generator package.
 */

/**
 * Escape a literal string for safe inclusion in a POSIX/ERE regex alternation.
 * Shared by the generator (permissions.ts) and template-assertion tests.
 */
export function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const ALLOWED_DOMAINS: readonly string[] = [
  'api.github.com',
  'registry.npmjs.org',
  'nodejs.org',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'pypi.org',
  'files.pythonhosted.org',
];

export const EXPECTED_ALLOWED_DOMAINS_COUNT = ALLOWED_DOMAINS.length;

/**
 * Destructive bash command literals used both as `Bash(<cmd>:*)` deny entries
 * and as the base of the pre-tool-use guard regex alternation.
 */
export const DESTRUCTIVE_BASH_PATTERNS: readonly string[] = [
  'rm -rf',
  'rm -r',
  'rm --recursive',
  'rm --force',
  'git push --force',
  'git push -f',
  'git push --force-with-lease',
  'git reset --hard',
  'git reset --merge',
  'git clean -fd',
  'git clean -f',
  'git branch -D',
  // Prevent any form of commit or push
  'git push',
  'git commit',
  'git commit --amend',
  'git rm',
  // Privilege escalation
  'sudo',
];

/**
 * Additional regex fragments for the pre-tool-use guard that cannot be
 * represented as plain command literals (e.g. patterns with shell metacharacters).
 * These are combined with DESTRUCTIVE_BASH_PATTERNS into the grep -qE alternation.
 */
export const PRE_TOOL_USE_PATTERN_EXTRAS: readonly string[] = [
  'curl .*\\| *sh',
  'curl .*\\| *bash',
  'wget .*\\| *sh',
  'wget .*\\| *bash',
];

/**
 * Raw-interpreter and shell-wrapper invocations that evaluate arbitrary code
 * inline. Listed as command-prefix literals so the deny list and guard regex
 * both block every `<runtime> <eval-flag>` combination explicitly.
 */
const RAW_INTERPRETER_PATTERNS: readonly string[] = [
  'pwsh',
  'pwsh.exe',
  'powershell',
  'powershell.exe',
  'cmd /c',
  'cmd /k',
  'cmd.exe /c',
  'cmd.exe /k',
  'node -e',
  'node --eval',
  'python -c',
  'python3 -c',
];

/**
 * Bash command literals that must remain blocked and mirrored in the pre-tool-use
 * guard alternation to keep the runtime guard aligned with the deny list.
 */
export const BASH_DENY_COMMAND_PATTERNS: readonly string[] = [
  ...DESTRUCTIVE_BASH_PATTERNS,
  'npm publish',
  'pnpm publish',
  'cargo publish',
  'twine upload',
  'terraform apply',
  'kubectl apply',
  'kubectl delete',
  'Invoke-WebRequest',
  'iwr',
  'Invoke-RestMethod',
  'irm',
  'curl.exe',
  'wget.exe',
  ...RAW_INTERPRETER_PATTERNS,
];

/**
 * Sandbox-execution wrappers that bridge from a host shell into an isolated
 * environment (WSL, Docker / Compose, Podman, devcontainer CLI). PRD §1.9.2
 * recommends running agents in these environments; the deny / allow tables
 * therefore include parallel rules for each wrapper so agents inside a
 * sandbox stay subject to the same prefix_rule guarantees as the host.
 *
 * Each wrapper is treated literally: `wsl`, `docker exec`, `docker compose
 * exec`, `podman exec`, `devcontainer exec`. Wrappers with opaque -c bodies
 * (`ssh user@host -c '...'`, `vagrant ssh -c '...'`) are deliberately omitted
 * — they have the same prefix_rule-bypass shape as `pwsh -Command` (PRD
 * §1.9.1 item 10.3) and stay disallowed.
 */
const SANDBOX_WRAPPER_PREFIXES: readonly string[] = [
  'wsl',
  'docker exec',
  'docker compose exec',
  'podman exec',
  'devcontainer exec',
];

/**
 * Inner-command shapes that, when reachable through any sandbox wrapper,
 * would let a caller bypass the prefix_rule deny list (raw interpreters and
 * shell `-c` evaluators). Block both the bare and flag-prefixed forms so
 * e.g. `wsl bash -c "rm -rf /"` and `docker exec myc pwsh -Command "iwr ..."`
 * are both denied before allow rules are checked.
 */
const SANDBOX_INNER_DENIES: readonly string[] = [
  ...RAW_INTERPRETER_PATTERNS,
  // -c / -Command-style interpreters not in RAW_INTERPRETER_PATTERNS
  'bash -c',
  'sh -c',
  'zsh -c',
  'dash -c',
  'ksh -c',
];

function expandWrapper(wrapper: string, inners: readonly string[]): string[] {
  return inners.flatMap((inner: string) => [
    `Bash(${wrapper} ${inner}:*)`,
    `Bash(${wrapper} * ${inner}:*)`,
  ]);
}

export const SANDBOX_WRAPPER_DENIES: readonly string[] = SANDBOX_WRAPPER_PREFIXES.flatMap(
  (wrapper: string) => expandWrapper(wrapper, SANDBOX_INNER_DENIES),
);

/**
 * Non-bash deny entries that are NOT derived from BASH_DENY_COMMAND_PATTERNS
 * (filesystem editors, pipe-to-shell bash expressions, secret-path globs).
 * Pure `Bash(<cmd>:*)` patterns belong in BASH_DENY_COMMAND_PATTERNS instead.
 */
const EXTRA_DENY_PATTERNS: readonly string[] = [
  // Pipe-to-shell (curl/wget without .exe — plain curl/wget for read-only fetches are allowed)
  'Bash(curl* | sh)',
  'Bash(curl* | bash)',
  'Bash(wget* | sh)',
  'Bash(wget* | bash)',
  // Filesystem editors: absolute and home-relative paths are off-limits
  'Edit(/**)',
  'Edit(~/**)',
  'Write(/**)',
  'Write(~/**)',
  'MultiEdit(/**)',
  'MultiEdit(~/**)',
  // Secret/credential path globs
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

/**
 * Complete deny list: DESTRUCTIVE_BASH_PATTERNS mapped to Bash entries, the
 * wsl-wrapper denies (so wsl-wrapped pwsh/cmd/bash -c cannot bypass the
 * prefix_rule deny list), plus all additional deny patterns. This is the
 * single source of truth for buildDenyList().
 */
export const DENY_PATTERNS: readonly string[] = [
  ...BASH_DENY_COMMAND_PATTERNS.map((p: string) => `Bash(${p}:*)`),
  ...SANDBOX_WRAPPER_DENIES,
  ...EXTRA_DENY_PATTERNS,
];

/**
 * Local git subcommand allow entries: read-only inspection only.
 * Broad `Bash(git:*)` is intentionally excluded; mutating git operations stay denied
 * or require explicit approval in the current session.
 */
export const LOCAL_GIT_ALLOWS: readonly string[] = [
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git branch:*)',
];

/**
 * Toolchain command allow entries for common dev tools not covered by pnpm.
 */
export const TOOLCHAIN_ALLOWS: readonly string[] = [
  'Bash(tsc:*)',
  'Bash(jest:*)',
  'Bash(eslint:*)',
  'Bash(prettier:*)',
];

/**
 * Cross-model handoff allow entries (§1.7.2): lets Claude Code invoke Codex in
 * headless mode (`codex exec`) and lets Codex invoke Claude Code in headless
 * mode (`claude -p`) as the subprocess fallback when the official Codex plugin
 * for Claude Code (`codex-plugin-cc`) is unavailable. The plugin itself uses
 * MCP, which does not require any Bash allowlist entry.
 */
export const CROSS_MODEL_HANDOFF_ALLOWS: readonly string[] = [
  'Bash(codex exec:*)',
  'Bash(claude -p:*)',
];

/**
 * Inner commands that may be safely invoked through any sandbox wrapper from
 * the host. Combines the package-manager binaries, local read-only git, the
 * toolchain binaries, and the cross-model handoff binaries so a host-side
 * Claude Code or Codex session can drive a project that lives inside WSL,
 * a docker/podman container, or a devcontainer.
 *
 * Two patterns are emitted per (wrapper, inner) pair:
 *   `Bash(<wrapper> <inner>:*)`     — matches the bare form
 *                                     (e.g. `wsl pnpm test`)
 *   `Bash(<wrapper> * <inner>:*)`   — matches the flag-prefixed form
 *                                     (e.g. `wsl --distribution Ubuntu pnpm test`,
 *                                     `docker exec -i myc pnpm test`)
 *
 * The SANDBOX_WRAPPER_DENIES above run first, so a wrapper invocation that
 * targets a raw interpreter (`wsl pwsh`, `docker exec myc bash -c "..."`,
 * etc.) is blocked before allow rules are evaluated.
 */
const SANDBOX_INNER_ALLOWED: readonly string[] = [
  'pnpm',
  'npm',
  'yarn',
  'bun',
  'git status',
  'git diff',
  'git log',
  'git branch',
  'tsc',
  'jest',
  'eslint',
  'prettier',
  'codex exec',
  'claude -p',
];

export const SANDBOX_WRAPPER_ALLOWS: readonly string[] = SANDBOX_WRAPPER_PREFIXES.flatMap(
  (wrapper: string) => expandWrapper(wrapper, SANDBOX_INNER_ALLOWED),
);
