import { ALLOWED_DOMAINS } from '../../src/generator/permission-constants.js';

interface SettingsShape {
  permissions: { defaultMode: string; disableBypassPermissionsMode: string };
  sandbox: {
    enabled: boolean;
    mode: string;
    autoAllowBashIfSandboxed: boolean;
    allowedDomains: string[];
  };
}

export type ExpectedDefaultMode = 'default' | 'acceptEdits';

export function assertSettingsJsonShape(
  settings: SettingsShape,
  expectedDefaultMode: ExpectedDefaultMode = 'default',
): void {
  expect(settings.permissions.defaultMode).toBe(expectedDefaultMode);
  expect(settings.permissions.disableBypassPermissionsMode).toBe('disable');
  expect(settings.sandbox.enabled).toBe(true);
  expect(settings.sandbox.mode).toBe('workspace-write');
  expect(settings.sandbox.autoAllowBashIfSandboxed).toBe(false);
  expect(settings.sandbox.allowedDomains).toEqual([...ALLOWED_DOMAINS]);
}
