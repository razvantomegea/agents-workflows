import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SECURITY_DEFAULTS, type SecurityConfig } from '../../src/schema/stack-config.js';

const mockConfirm = jest.fn<() => Promise<boolean>>();
const mockSelect = jest.fn<() => Promise<string>>();
const mockInput = jest.fn<() => Promise<string>>();

jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: mockConfirm,
  select: mockSelect,
  input: mockInput,
  checkbox: jest.fn<() => Promise<string[]>>(),
}));

const { resolveSecurityUpdate } = await import('../../src/cli/resolve-security-update.js');

const NI_DOCKER: SecurityConfig = {
  nonInteractiveMode: true,
  runsIn: 'docker',
  disclosureAcknowledgedAt: '2026-01-01T00:00:00.000Z',
};

describe('resolveSecurityUpdate — branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Branch 1 — explicit flags', () => {
    it('--isolation alone returns runsIn baseline with NI off', async () => {
      const result = await resolveSecurityUpdate({
        existing: SECURITY_DEFAULTS,
        isolation: 'devcontainer',
      });

      expect(result).toEqual({
        nonInteractiveMode: false,
        runsIn: 'devcontainer',
        disclosureAcknowledgedAt: null,
      });
    });

    it('--non-interactive --isolation=docker enables NI', async () => {
      const result = await resolveSecurityUpdate({
        existing: SECURITY_DEFAULTS,
        nonInteractive: true,
        isolation: 'docker',
      });

      expect(result.nonInteractiveMode).toBe(true);
      expect(result.runsIn).toBe('docker');
      expect(result.disclosureAcknowledgedAt).not.toBeNull();
    });
  });

  describe('Branch 2 — --yes preserves existing', () => {
    it('returns existing verbatim under --yes', async () => {
      const result = await resolveSecurityUpdate({ existing: NI_DOCKER, yes: true });

      expect(result).toBe(NI_DOCKER);
    });

    it('returns existing verbatim under --noPrompt', async () => {
      const result = await resolveSecurityUpdate({ existing: NI_DOCKER, noPrompt: true });

      expect(result).toBe(NI_DOCKER);
    });
  });

  describe('Branch 3 — currently ON', () => {
    it('keeping NI on with same isolation preserves the original disclosure timestamp', async () => {
      mockConfirm.mockResolvedValueOnce(true); // keep NI?
      mockSelect.mockResolvedValueOnce('docker'); // isolation re-confirm (same)

      const result = await resolveSecurityUpdate({ existing: NI_DOCKER });

      expect(result).toEqual(NI_DOCKER);
    });

    it('flipping NI off but keeping isolation returns runsIn baseline', async () => {
      mockConfirm.mockResolvedValueOnce(false); // keep NI? no
      mockSelect.mockResolvedValueOnce('docker'); // isolation re-confirm

      const result = await resolveSecurityUpdate({ existing: NI_DOCKER });

      expect(result).toEqual({
        nonInteractiveMode: false,
        runsIn: 'docker',
        disclosureAcknowledgedAt: null,
      });
    });

    it('isolation re-prompt defaults to existing runsIn', async () => {
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce('docker');

      await resolveSecurityUpdate({ existing: NI_DOCKER });

      const args = mockSelect.mock.calls[0][0] as { default?: string };
      expect(args.default).toBe('docker');
    });

    it('keep NI on but change isolation: NI stays enabled with new runsIn (no redundant confirm)', async () => {
      mockConfirm.mockResolvedValueOnce(true); // keep NI? yes
      mockSelect.mockResolvedValueOnce('vm'); // change docker → vm

      const before = Date.now();
      const result = await resolveSecurityUpdate({ existing: NI_DOCKER });
      const after = Date.now();

      expect(result.nonInteractiveMode).toBe(true);
      expect(result.runsIn).toBe('vm');
      // Fresh timestamp — not the original 2026-01-01 from NI_DOCKER.
      const ts = new Date(result.disclosureAcknowledgedAt ?? '').getTime();
      expect(ts).toBeGreaterThanOrEqual(before - 5000);
      expect(ts).toBeLessThanOrEqual(after + 5000);
      // Only one confirm should have fired (keep NI?), not a redundant disclosure confirm.
      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });

    it('keep NI on and switch into host-os: requires accept phrase, NI stays on with new runsIn', async () => {
      mockConfirm.mockResolvedValueOnce(true); // keep NI? yes
      mockSelect.mockResolvedValueOnce('host-os'); // change docker → host-os
      mockInput.mockResolvedValueOnce('yes, I accept the risks');

      const result = await resolveSecurityUpdate({ existing: NI_DOCKER });

      expect(result.nonInteractiveMode).toBe(true);
      expect(result.runsIn).toBe('host-os');
      expect(mockInput).toHaveBeenCalledTimes(1);
    });

    it('keep NI on and switch into host-os without accept phrase: returns baseline (NI off)', async () => {
      mockConfirm.mockResolvedValueOnce(true); // keep NI? yes
      mockSelect.mockResolvedValueOnce('host-os');
      mockInput.mockResolvedValueOnce('nope');

      const result = await resolveSecurityUpdate({ existing: NI_DOCKER });

      expect(result).toEqual({
        nonInteractiveMode: false,
        runsIn: 'host-os',
        disclosureAcknowledgedAt: null,
      });
    });
  });

  describe('Branch 4 — currently OFF', () => {
    it('user declines enable but isolation captured as baseline', async () => {
      mockSelect.mockResolvedValueOnce('vm'); // isolation
      mockConfirm.mockResolvedValueOnce(false); // enable NI? no

      const result = await resolveSecurityUpdate({ existing: SECURITY_DEFAULTS });

      expect(result).toEqual({
        nonInteractiveMode: false,
        runsIn: 'vm',
        disclosureAcknowledgedAt: null,
      });
    });

    it('user enables NI with vm isolation captured first', async () => {
      mockSelect.mockResolvedValueOnce('vm'); // isolation
      mockConfirm.mockResolvedValueOnce(true); // enable NI? yes
      mockConfirm.mockResolvedValueOnce(true); // disclosure confirm

      const result = await resolveSecurityUpdate({ existing: SECURITY_DEFAULTS });

      expect(result.nonInteractiveMode).toBe(true);
      expect(result.runsIn).toBe('vm');
      expect(result.disclosureAcknowledgedAt).not.toBeNull();
    });
  });
});
