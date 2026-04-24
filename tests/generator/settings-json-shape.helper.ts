import { EXPECTED_ALLOWED_DOMAINS_COUNT } from '../../src/generator/permission-constants.js';

interface SettingsShape {
  permissions: { defaultMode: string };
  sandbox: { mode: string; allowedDomains: string[] };
}

export function assertSettingsJsonShape(settings: SettingsShape): void {
  expect(settings.permissions.defaultMode).toBe('default');
  expect(settings.sandbox.mode).toBe('workspace-write');
  expect(settings.sandbox.allowedDomains).toHaveLength(EXPECTED_ALLOWED_DOMAINS_COUNT);
}
