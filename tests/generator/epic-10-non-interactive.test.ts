// Cases 7–9 (template snapshots for .codex/config.toml + .claude/settings.json
// in both branches) are covered in tests/generator/epic-10-template-branching.test.ts.

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { parseNonInteractiveFlags, NonInteractiveFlagsError } from '../../src/cli/non-interactive-flags.js';
import { SECURITY_DEFAULTS, stackConfigSchema } from '../../src/schema/stack-config.js';
import { makeStackConfig, makeDetectedStack } from './fixtures.js';

// --- ESM mock for @inquirer/prompts must be registered before any import
//     that transitively loads @inquirer/prompts (runPromptFlow, askNonInteractiveMode).
const mockConfirm = jest.fn<() => Promise<boolean>>();
const mockSelect = jest.fn<() => Promise<string>>();
const mockInput = jest.fn<() => Promise<string>>();

jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: mockConfirm,
  select: mockSelect,
  input: mockInput,
  checkbox: jest.fn<() => Promise<string[]>>(),
}));

// Dynamic imports AFTER mock registration so they receive the mock.
const { runPromptFlow } = await import('../../src/prompt/index.js');
const { askNonInteractiveMode, HOST_OS_ACCEPT_PHRASE } = await import(
  '../../src/prompt/ask-non-interactive.js'
);

// ---------------------------------------------------------------------------

describe('Epic 10 non-interactive mode — cases 1–6', () => {
  describe('Case 1 — --yes alone returns safe defaults', () => {
    it('runPromptFlow with yes:true sets security to SECURITY_DEFAULTS', async () => {
      const config = await runPromptFlow(makeDetectedStack(), '/tmp/fake-root', { yes: true });

      expect(config.security.nonInteractiveMode).toBe(false);
      expect(config.security.runsIn).toBeNull();
      expect(config.security.disclosureAcknowledgedAt).toBeNull();
    });
  });

  describe('Case 2 — --non-interactive --isolation=docker happy path', () => {
    it('(a) parseNonInteractiveFlags returns enabled=true with docker isolation', () => {
      const result = parseNonInteractiveFlags({
        nonInteractive: true,
        isolation: 'docker',
        acceptRisks: false,
      });

      expect(result).toEqual({ enabled: true, isolation: 'docker', acceptedHostOsRisk: false });
    });

    it('(b) askNonInteractiveMode with nonInteractive=true and docker returns nonInteractiveMode and valid ISO timestamp', async () => {
      const before = Date.now();
      const result = await askNonInteractiveMode({ nonInteractive: true, isolation: 'docker' });
      const after = Date.now();

      expect(result.nonInteractiveMode).toBe(true);
      expect(result.runsIn).toBe('docker');
      const ts = new Date(result.disclosureAcknowledgedAt ?? '').getTime();
      expect(ts).toBeGreaterThanOrEqual(before - 5000);
      expect(ts).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('Case 3 — host-os without --accept-risks throws', () => {
    it('throws NonInteractiveFlagsError with the PRD-mandated message', () => {
      const act = (): void => {
        parseNonInteractiveFlags({ nonInteractive: true, isolation: 'host-os' });
      };

      expect(act).toThrow(NonInteractiveFlagsError);
      expect(act).toThrow(
        '--non-interactive --isolation=host-os requires --accept-risks (see PRD §1.9.1)',
      );
    });
  });

  describe('Case 4 — --non-interactive without --isolation throws', () => {
    it('throws NonInteractiveFlagsError with the PRD-mandated message', () => {
      const act = (): void => {
        parseNonInteractiveFlags({ nonInteractive: true });
      };

      expect(act).toThrow(NonInteractiveFlagsError);
      expect(act).toThrow('--non-interactive requires --isolation=<env>');
    });
  });

  describe('Case 5 — stackConfigSchema round-trip with nonInteractiveMode===true preserves all fields', () => {
    it('security fields survive JSON serialize → parse intact', () => {
      const config = makeStackConfig({
        security: {
          nonInteractiveMode: true,
          runsIn: 'vm',
          disclosureAcknowledgedAt: '2026-04-25T12:00:00.000Z',
        },
      });

      const parsed = JSON.parse(JSON.stringify(config)) as unknown;
      const result = stackConfigSchema.safeParse(parsed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.security).toEqual({
          nonInteractiveMode: true,
          runsIn: 'vm',
          disclosureAcknowledgedAt: '2026-04-25T12:00:00.000Z',
        });
      }
    });
  });

  describe('Case 6 — config without security key parses to safe defaults', () => {
    it('stackConfigSchema fills in SECURITY_DEFAULTS when security key is absent', () => {
      const config = makeStackConfig();
      const { security: _removed, ...rest } = config;
      const result = stackConfigSchema.safeParse(JSON.parse(JSON.stringify(rest)));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.security).toEqual(SECURITY_DEFAULTS);
    });

    it('round-trip is stable: re-parsing a default-filled config yields the same security defaults', () => {
      const config = makeStackConfig();
      const { security: _removed, ...rest } = config;
      const first = stackConfigSchema.safeParse(JSON.parse(JSON.stringify(rest)));
      expect(first.success).toBe(true);
      if (!first.success) return;
      const second = stackConfigSchema.safeParse(JSON.parse(JSON.stringify(first.data)));
      expect(second.success).toBe(true);
      if (second.success) expect(second.data.security).toEqual(SECURITY_DEFAULTS);
    });
  });
});

describe('Epic 10 — askNonInteractiveMode branch coverage and host-os guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns SECURITY_DEFAULTS when yes=true and no other flags', async () => {
    const result = await askNonInteractiveMode({ yes: true });

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns SECURITY_DEFAULTS when nonInteractive=false', async () => {
    const result = await askNonInteractiveMode({ nonInteractive: false });

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns SECURITY_DEFAULTS when user declines the enable confirm', async () => {
    mockConfirm.mockResolvedValueOnce(false);

    const result = await askNonInteractiveMode({});

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns nonInteractiveMode=true with docker when user accepts and selects docker', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockSelect.mockResolvedValueOnce('docker');

    const before = Date.now();
    const result = await askNonInteractiveMode({});
    const after = Date.now();

    expect(result.nonInteractiveMode).toBe(true);
    expect(result.runsIn).toBe('docker');
    const ts = new Date(result.disclosureAcknowledgedAt ?? '').getTime();
    expect(ts).toBeGreaterThanOrEqual(before - 1000);
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });

  it('returns SECURITY_DEFAULTS when user types a wrong phrase for host-os', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockSelect.mockResolvedValueOnce('host-os');
    mockInput.mockResolvedValueOnce('yes');

    const result = await askNonInteractiveMode({});

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns nonInteractiveMode=true with host-os when exact accept phrase is typed', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockSelect.mockResolvedValueOnce('host-os');
    mockInput.mockResolvedValueOnce(HOST_OS_ACCEPT_PHRASE);

    const result = await askNonInteractiveMode({});

    expect(result.nonInteractiveMode).toBe(true);
    expect(result.runsIn).toBe('host-os');
    expect(result.disclosureAcknowledgedAt).not.toBeNull();
  });
});
