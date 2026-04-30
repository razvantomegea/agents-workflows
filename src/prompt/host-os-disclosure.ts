const HOST_OS_WARNING_LINES: readonly string[] = [
  'WARNING: Running on your primary OS exposes the following to a prompt-injected agent:',
  '  - ~/.ssh/*',
  '  - ~/.aws/credentials',
  '  - ~/.config/gh/hosts.yml',
  '  - Browser cookie stores',
  '  - Windows %APPDATA%',
  'The workspace-write sandbox restricts WRITES only — reads are unrestricted.',
];

export const HOST_OS_WARNING = HOST_OS_WARNING_LINES.join('\n');

/**
 * Writes the host-OS isolation warning message to `process.stdout`.
 *
 * @remarks
 * Side effects: writes directly to `process.stdout` (not via `logger`).
 * The warning lists credential paths and browser stores that are readable by a prompt-injected
 * agent when running on the primary OS without a container or sandbox.
 * Called before the host-OS acceptance phrase prompt in `promptNonInteractiveHostOsAcceptance`.
 */
export function printHostOsWarning(): void {
  process.stdout.write('\n' + HOST_OS_WARNING + '\n\n');
}
