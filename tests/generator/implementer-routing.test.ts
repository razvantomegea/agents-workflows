import { describe, it, expect } from '@jest/globals';
import { getApplicableImplementerVariant } from '../../src/generator/implementer-routing.js';
import { makeDetectedStack } from './fixtures.js';
import type { ImplementerVariant } from '../../src/schema/stack-config.js';

describe('getApplicableImplementerVariant — 13-row decision table', () => {
  type ImplementerRoutingCase = Readonly<{
    label: string;
    overrides: Parameters<typeof makeDetectedStack>[0];
    expected: ImplementerVariant;
  }>;

  it.each<ImplementerRoutingCase>([
    {
      label: 'spring-boot framework → java-spring',
      overrides: { framework: { value: 'spring-boot', confidence: 0.9 }, language: { value: 'java', confidence: 0.9 } },
      expected: 'java-spring',
    },
    {
      label: 'aspnetcore framework → dotnet-csharp',
      overrides: { framework: { value: 'aspnetcore', confidence: 0.9 }, language: { value: 'csharp', confidence: 0.9 } },
      expected: 'dotnet-csharp',
    },
    {
      label: 'vue framework → vue',
      overrides: { framework: { value: 'vue', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      expected: 'vue',
    },
    {
      label: 'nuxt framework → vue',
      overrides: { framework: { value: 'nuxt', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      expected: 'vue',
    },
    {
      label: 'angular framework → angular',
      overrides: { framework: { value: 'angular', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      expected: 'angular',
    },
    {
      label: 'sveltekit framework → svelte',
      overrides: { framework: { value: 'sveltekit', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      expected: 'svelte',
    },
    {
      label: 'nextjs + typescript → react-ts',
      overrides: { framework: { value: 'nextjs', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      expected: 'react-ts',
    },
    {
      label: 'nestjs + typescript → node-ts-backend',
      overrides: { framework: { value: 'nestjs', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      expected: 'node-ts-backend',
    },
    {
      label: 'python language → python',
      overrides: { framework: { value: null, confidence: 0 }, language: { value: 'python', confidence: 0.9 } },
      expected: 'python',
    },
    {
      label: 'go language → go',
      overrides: { framework: { value: null, confidence: 0 }, language: { value: 'go', confidence: 0.9 } },
      expected: 'go',
    },
    {
      label: 'rust language → rust',
      overrides: { framework: { value: null, confidence: 0 }, language: { value: 'rust', confidence: 0.9 } },
      expected: 'rust',
    },
    {
      label: 'typescript + no framework → typescript',
      overrides: { framework: { value: null, confidence: 0 }, language: { value: 'typescript', confidence: 0.9 } },
      expected: 'typescript',
    },
    {
      label: 'javascript + no framework → javascript',
      overrides: { framework: { value: null, confidence: 0 }, language: { value: 'javascript', confidence: 0.9 } },
      expected: 'javascript',
    },
    {
      label: 'unknown language + no framework → generic',
      overrides: { framework: { value: null, confidence: 0 }, language: { value: 'kotlin', confidence: 0.9 } },
      expected: 'generic',
    },
  ])('$label', ({ overrides, expected }: ImplementerRoutingCase) => {
    const detected = makeDetectedStack(overrides);
    expect(getApplicableImplementerVariant(detected)).toBe(expected);
  });
});
