export const IMPLEMENTER_VARIANTS = [
  'generic',
  'typescript',
  'javascript',
  'react-ts',
  'node-ts-backend',
  'python',
  'go',
  'rust',
  'java-spring',
  'dotnet-csharp',
  'vue',
  'angular',
  'svelte',
] as const;

export type ImplementerVariant = (typeof IMPLEMENTER_VARIANTS)[number];

/**
 * Migration preprocess for the `agents` object.
 * Strips any key matching /Senior$/ whose value is boolean (covers `reactTsSenior`
 * and any future *Senior drift), then maps the legacy `reactTsSenior: true` to
 * `implementerVariant: 'react-ts'` when no explicit `implementerVariant` is set.
 */
export function migrateLegacyAgents(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return raw;
  }

  const input = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    // Case-insensitive on purpose: defends against arbitrary casing of legacy *Senior boolean keys.
    const isSeniorBooleanKey = /Senior$/i.test(key) && typeof input[key] === 'boolean';
    if (!isSeniorBooleanKey) {
      result[key] = input[key];
    }
  }

  if (input['reactTsSenior'] === true && result['implementerVariant'] === undefined) {
    result['implementerVariant'] = 'react-ts';
  }

  return result;
}
