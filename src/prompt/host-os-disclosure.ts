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

export function printHostOsWarning(): void {
  process.stdout.write('\n' + HOST_OS_WARNING + '\n\n');
}
