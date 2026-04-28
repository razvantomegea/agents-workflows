import { describe, it, expect } from '@jest/globals';
import { getApplicableImplementerVariant } from '../../src/generator/implementer-routing.js';
import { makeDetectedStack } from './fixtures.js';
import type { ImplementerVariant } from '../../src/schema/stack-config.js';

describe('getApplicableImplementerVariant — 13-row decision table', () => {
  it.each<[string, Parameters<typeof makeDetectedStack>[0], ImplementerVariant]>([
    [
      'spring-boot framework → java-spring',
      { framework: { value: 'spring-boot', confidence: 0.9 }, language: { value: 'java', confidence: 0.9 } },
      'java-spring',
    ],
    [
      'aspnetcore framework → dotnet-csharp',
      { framework: { value: 'aspnetcore', confidence: 0.9 }, language: { value: 'csharp', confidence: 0.9 } },
      'dotnet-csharp',
    ],
    [
      'vue framework → vue',
      { framework: { value: 'vue', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      'vue',
    ],
    [
      'nuxt framework → vue',
      { framework: { value: 'nuxt', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      'vue',
    ],
    [
      'angular framework → angular',
      { framework: { value: 'angular', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      'angular',
    ],
    [
      'sveltekit framework → svelte',
      { framework: { value: 'sveltekit', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      'svelte',
    ],
    [
      'nextjs + typescript → react-ts',
      { framework: { value: 'nextjs', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      'react-ts',
    ],
    [
      'nestjs + typescript → node-ts-backend',
      { framework: { value: 'nestjs', confidence: 0.9 }, language: { value: 'typescript', confidence: 0.9 } },
      'node-ts-backend',
    ],
    [
      'python language → python',
      { framework: { value: null, confidence: 0 }, language: { value: 'python', confidence: 0.9 } },
      'python',
    ],
    [
      'go language → go',
      { framework: { value: null, confidence: 0 }, language: { value: 'go', confidence: 0.9 } },
      'go',
    ],
    [
      'rust language → rust',
      { framework: { value: null, confidence: 0 }, language: { value: 'rust', confidence: 0.9 } },
      'rust',
    ],
    [
      'typescript + no framework → typescript',
      { framework: { value: null, confidence: 0 }, language: { value: 'typescript', confidence: 0.9 } },
      'typescript',
    ],
    [
      'javascript + no framework → javascript',
      { framework: { value: null, confidence: 0 }, language: { value: 'javascript', confidence: 0.9 } },
      'javascript',
    ],
    [
      'unknown language + no framework → generic',
      { framework: { value: null, confidence: 0 }, language: { value: 'kotlin', confidence: 0.9 } },
      'generic',
    ],
  ])('%s', (_label, overrides, expected) => {
    const detected = makeDetectedStack(overrides);
    expect(getApplicableImplementerVariant(detected)).toBe(expected);
  });
});
