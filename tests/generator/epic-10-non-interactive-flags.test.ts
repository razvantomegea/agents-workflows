import { describe, expect, it } from '@jest/globals';
import { NonInteractiveFlagsError, parseNonInteractiveFlags } from '../../src/cli/non-interactive-flags.js';
import { SECURITY_DEFAULTS, stackConfigSchema } from '../../src/schema/stack-config.js';
import { makeStackConfig } from './fixtures.js';

describe('Epic 10 non-interactive mode flags and schema — cases 2–6', () => {
  describe('Case 2 — --non-interactive valid isolations', () => {
    it('returns enabled=true with docker isolation', () => {
      const result = parseNonInteractiveFlags({
        nonInteractive: true,
        isolation: 'docker',
        acceptRisks: false,
      });

      expect(result).toEqual({ enabled: true, isolation: 'docker', acceptedHostOsRisk: false });
    });

    it('accepts isolation=vm without acceptRisks', () => {
      const result = parseNonInteractiveFlags({
        nonInteractive: true,
        isolation: 'vm',
        acceptRisks: false,
      });

      expect(result).toEqual({ enabled: true, isolation: 'vm', acceptedHostOsRisk: false });
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

  describe('Case 4b — --isolation alone without --non-interactive', () => {
    it('returns enabled=false but propagates the isolation baseline', () => {
      const result = parseNonInteractiveFlags({ isolation: 'devcontainer' });

      expect(result).toEqual({
        enabled: false,
        isolation: 'devcontainer',
        acceptedHostOsRisk: false,
      });
    });

    it('allows --isolation=host-os alone without --accept-risks (no NI gate)', () => {
      const result = parseNonInteractiveFlags({ isolation: 'host-os' });

      expect(result).toEqual({
        enabled: false,
        isolation: 'host-os',
        acceptedHostOsRisk: false,
      });
    });

    it('--no-non-interactive --isolation=foo propagates isolation baseline', () => {
      const result = parseNonInteractiveFlags({ nonInteractive: false, isolation: 'vm' });

      expect(result).toEqual({
        enabled: false,
        isolation: 'vm',
        acceptedHostOsRisk: false,
      });
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
    it('fills in SECURITY_DEFAULTS when security key is absent', () => {
      const config = makeStackConfig();
      const { security: _removed, ...rest } = config;
      const result = stackConfigSchema.safeParse(JSON.parse(JSON.stringify(rest)));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.security).toEqual(SECURITY_DEFAULTS);
      }
    });

    it('returns a fresh default object on each parse', () => {
      const config = makeStackConfig();
      const { security: _removed, ...rest } = config;
      const first = stackConfigSchema.parse(JSON.parse(JSON.stringify(rest)));
      const second = stackConfigSchema.parse(JSON.parse(JSON.stringify(rest)));

      expect(first.security).toEqual(SECURITY_DEFAULTS);
      expect(second.security).toEqual(SECURITY_DEFAULTS);
      expect(first.security).not.toBe(second.security);
    });
  });
});
