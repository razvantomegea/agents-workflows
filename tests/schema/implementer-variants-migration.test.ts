import { describe, it, expect } from '@jest/globals';
import { migrateLegacyAgents } from '../../src/schema/implementer-variants.js';
import { manifestSchema } from '../../src/schema/manifest.js';
import { makeStackConfig } from '../generator/fixtures.js';

describe('migrateLegacyAgents helper', () => {
  it('maps reactTsSenior: true to implementerVariant: react-ts when no implementerVariant set', () => {
    const result = migrateLegacyAgents({ reactTsSenior: true, implementer: true }) as Record<string, unknown>;

    expect(result['implementerVariant']).toBe('react-ts');
    expect('reactTsSenior' in result).toBe(false);
  });

  it('strips reactTsSenior: false (Senior-keyed boolean always stripped)', () => {
    const result = migrateLegacyAgents({ reactTsSenior: false, implementer: true }) as Record<string, unknown>;

    expect('reactTsSenior' in result).toBe(false);
    expect(result['implementerVariant']).toBeUndefined();
  });

  it('keeps existing implementerVariant when reactTsSenior: true also present (no override)', () => {
    const result = migrateLegacyAgents({
      reactTsSenior: true,
      implementerVariant: 'python',
      implementer: true,
    }) as Record<string, unknown>;

    expect(result['implementerVariant']).toBe('python');
    expect('reactTsSenior' in result).toBe(false);
  });

  it('strips any *Senior boolean key (fooSenior) but preserves non-Senior boolean key (implementer)', () => {
    // Both fooSenior and barSenior end with "Senior" → both stripped.
    // implementer does not end with "Senior" → preserved.
    const result = migrateLegacyAgents({
      fooSenior: true,
      barSenior: false,
      implementer: true,
    }) as Record<string, unknown>;

    expect('fooSenior' in result).toBe(false);
    expect('barSenior' in result).toBe(false);
    expect(result['implementer']).toBe(true);
  });

  it('passes through non-object input unchanged', () => {
    expect(migrateLegacyAgents(null)).toBeNull();
    expect(migrateLegacyAgents('string')).toBe('string');
    expect(migrateLegacyAgents(42)).toBe(42);
  });
});

describe('manifestSchema legacy migration via parse', () => {
  const baseConfig = makeStackConfig();

  it('reactTsSenior: true migrates to implementerVariant: react-ts and reactTsSenior is absent', () => {
    const legacyAgents = {
      ...baseConfig.agents,
      reactTsSenior: true,
    };
    delete (legacyAgents as Record<string, unknown>)['implementerVariant'];
    const manifest = {
      version: '1',
      generatedAt: new Date().toISOString(),
      stackConfigHash: 'abc123',
      config: { ...baseConfig, agents: legacyAgents },
      files: [],
    };

    const result = manifestSchema.parse(manifest);

    expect(result.config.agents.implementerVariant).toBe('react-ts');
    expect('reactTsSenior' in result.config.agents).toBe(false);
  });

  it('config without reactTsSenior applies generic default', () => {
    const agents = { ...baseConfig.agents };
    delete (agents as Record<string, unknown>)['implementerVariant'];
    const manifest = {
      version: '1',
      generatedAt: new Date().toISOString(),
      stackConfigHash: 'abc123',
      config: { ...baseConfig, agents },
      files: [],
    };

    const result = manifestSchema.parse(manifest);

    expect(result.config.agents.implementerVariant).toBe('generic');
  });
});
