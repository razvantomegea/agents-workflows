import { describe, it, expect } from '@jest/globals';
import { mergeJson } from '../../src/generator/merge-json.js';

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parse(text: string): unknown {
  return JSON.parse(text);
}

describe('mergeJson', () => {
  it('preserves user-added allow entry and applies new generator deny rule', () => {
    const existing = json({ permissions: { allow: ['Read', 'UserCustomAllow'], deny: [] } });
    const incoming = json({ permissions: { allow: ['Read', 'Write'], deny: ['Exec'] } });

    const result = parse(mergeJson({ existing, incoming })) as {
      permissions: { allow: string[]; deny: string[] };
    };

    expect(result.permissions.allow).toContain('Read');
    expect(result.permissions.allow).toContain('UserCustomAllow');
    expect(result.permissions.allow).toContain('Write');
    expect(result.permissions.deny).toContain('Exec');
  });

  it('produces stable key order across runs (snapshot-safe)', () => {
    const existing = json({ z: 1, a: 2, m: 3 });
    const incoming = json({ b: 4, a: 5 });

    const first = mergeJson({ existing, incoming });
    const second = mergeJson({ existing, incoming });

    expect(first).toBe(second);
    expect(Object.keys(parse(first) as Record<string, unknown>)).toEqual(['a', 'b', 'm', 'z']);
  });

  it('deep-merges nested objects and preserves user-added nested keys', () => {
    const existing = json({ outer: { userKey: 'mine', shared: 'user' } });
    const incoming = json({ outer: { genKey: 'gen', shared: 'gen' } });

    const result = parse(mergeJson({ existing, incoming })) as {
      outer: { userKey: string; shared: string; genKey: string };
    };

    expect(result.outer.userKey).toBe('mine');
    expect(result.outer.genKey).toBe('gen');
    // scalar conflict — user wins
    expect(result.outer.shared).toBe('user');
  });

  it('preserves __proto__ as data without changing the merged object prototype', () => {
    const existing = '{"__proto__":{"polluted":true},"safe":"user"}';
    const incoming = json({ generated: true });

    const result = parse(mergeJson({ existing, incoming })) as Record<string, unknown>;
    const protoDescriptor = Object.getOwnPropertyDescriptor(result, '__proto__');

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(protoDescriptor?.value).toEqual({ polluted: true });
    expect(result.generated).toBe(true);
  });

  it('lets generator-controlled hard safety scalars win during conflicts', () => {
    const existing = json({
      permissions: {
        defaultMode: 'default',
        disableBypassPermissionsMode: 'enable',
      },
      sandbox: {
        enabled: false,
        mode: 'danger-full-access',
      },
    });
    const incoming = json({
      permissions: {
        defaultMode: 'acceptEdits',
        disableBypassPermissionsMode: 'disable',
      },
      sandbox: {
        enabled: true,
        mode: 'workspace-write',
      },
    });

    const result = parse(mergeJson({ existing, incoming })) as {
      permissions: {
        defaultMode: string;
        disableBypassPermissionsMode: string;
      };
      sandbox: {
        enabled: boolean;
        mode: string;
      };
    };

    expect(result.permissions.defaultMode).toBe('default');
    expect(result.permissions.disableBypassPermissionsMode).toBe('disable');
    expect(result.sandbox.enabled).toBe(true);
    expect(result.sandbox.mode).toBe('workspace-write');
  });

  it('scalar conflict — user value wins', () => {
    const existing = json({ x: 1 });
    const incoming = json({ x: 2 });

    const result = parse(mergeJson({ existing, incoming })) as { x: number };

    expect(result.x).toBe(1);
  });

  it('idempotent: merging same input twice produces identical parsed output', () => {
    const x = json({ a: [1, 2], b: { c: true } });

    const once = mergeJson({ existing: x, incoming: x });
    const twice = mergeJson({ existing: once, incoming: once });

    expect(parse(once)).toEqual(parse(twice));
  });

  it('array of objects — unique-by-stringify union preserves both sides', () => {
    const existing = json({ rules: [{ matcher: 'A' }] });
    const incoming = json({ rules: [{ matcher: 'B' }] });

    const result = parse(mergeJson({ existing, incoming })) as {
      rules: Array<{ matcher: string }>;
    };

    expect(result.rules).toHaveLength(2);
    expect(result.rules.map((r) => r.matcher)).toContain('A');
    expect(result.rules.map((r) => r.matcher)).toContain('B');
  });

  it('array of objects — duplicate object appears only once', () => {
    const existing = json({ rules: [{ matcher: 'A' }] });
    const incoming = json({ rules: [{ matcher: 'A' }] });

    const result = parse(mergeJson({ existing, incoming })) as {
      rules: Array<{ matcher: string }>;
    };

    expect(result.rules).toHaveLength(1);
  });

  it('primitive array union de-duplicates values', () => {
    const existing = json({ tags: ['a', 'b'] });
    const incoming = json({ tags: ['b', 'c'] });

    const result = parse(mergeJson({ existing, incoming })) as { tags: string[] };

    expect(result.tags).toEqual(['a', 'b', 'c']);
  });

  it('throws a descriptive error for malformed existing JSON including path', () => {
    expect(() =>
      mergeJson({ existing: '{bad json', incoming: '{}', path: '.claude/settings.local.json' }),
    ).toThrow('.claude/settings.local.json');
  });

  it('throws a descriptive error for malformed incoming JSON including path', () => {
    expect(() =>
      mergeJson({ existing: '{}', incoming: '{bad json', path: 'settings.json' }),
    ).toThrow('settings.json');
  });

  it('empty object merged with populated object — populated wins', () => {
    const existing = json({});
    const incoming = json({ key: 'value' });

    const result = parse(mergeJson({ existing, incoming })) as { key: string };

    expect(result.key).toBe('value');
  });

  it('null treated as scalar — user null wins over incoming value', () => {
    const existing = json({ x: null });
    const incoming = json({ x: 42 });

    const result = parse(mergeJson({ existing, incoming })) as { x: null };

    expect(result.x).toBeNull();
  });

  it('MANAGED_JSON_KEYS is exported and initially empty', async () => {
    const { MANAGED_JSON_KEYS } = await import('../../src/generator/merge-json.js');
    expect(Array.isArray(MANAGED_JSON_KEYS)).toBe(true);
    expect(MANAGED_JSON_KEYS).toHaveLength(0);
  });
});
