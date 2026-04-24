const EXPECTED_ALLOWED_DOMAINS = [
  'api.github.com',
  'registry.npmjs.org',
  'nodejs.org',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'pypi.org',
  'files.pythonhosted.org',
] as const;

interface SettingsShape {
  permissions: { defaultMode: string };
  sandbox: { mode: string; allowedDomains: string[] };
}

export function assertSettingsJsonShape(settings: SettingsShape): void {
  expect(settings.permissions.defaultMode).toBe('default');
  expect(settings.sandbox.mode).toBe('workspace-write');
  expect(settings.sandbox.allowedDomains).toEqual([...EXPECTED_ALLOWED_DOMAINS]);
}
