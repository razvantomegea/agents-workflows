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

export function assertSettingsJsonShape(settings: SettingsShape): void {
  expect(settings.permissions.defaultMode).toBe('default');
  expect(settings.permissions.disableBypassPermissionsMode).toBe('disable');
  expect(settings.sandbox.enabled).toBe(true);
  expect(settings.sandbox.mode).toBe('workspace-write');
  expect(settings.sandbox.autoAllowBashIfSandboxed).toBe(false);
  expect(settings.sandbox.allowedDomains).toEqual([...ALLOWED_DOMAINS]);
}
