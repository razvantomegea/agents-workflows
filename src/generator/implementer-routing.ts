import type { DetectedStack } from '../detector/types.js';
import { supportsReactTsStack } from '../constants/frameworks.js';
import type { ImplementerVariant } from '../schema/stack-config.js';

const NODE_TS_BACKEND_FRAMEWORKS = new Set(['nestjs', 'express', 'fastify', 'hono']);
const VUE_FRAMEWORKS = new Set(['vue', 'nuxt']);

export interface ImplementerVariantStack {
  language: string | null;
  framework: string | null;
}

/**
 * Determine the implementer variant to use based on a confirmed stack.
 * Evaluation order matters — the first matching rule wins.
 */
export function getApplicableImplementerVariantForStack(
  stack: Readonly<ImplementerVariantStack>,
): ImplementerVariant {
  const framework = stack.framework;
  const language = stack.language;

  // 1. Spring Boot
  if (framework === 'spring-boot') return 'java-spring';

  // 2. ASP.NET Core
  if (framework === 'aspnetcore') return 'dotnet-csharp';

  // 3. Vue / Nuxt
  if (framework !== null && VUE_FRAMEWORKS.has(framework)) return 'vue';

  // 4. Angular
  if (framework === 'angular') return 'angular';

  // 5. SvelteKit
  if (framework === 'sveltekit') return 'svelte';

  // 6. React + TypeScript (covers React, Next.js, Expo, RN, Remix on TS)
  if (language !== null && supportsReactTsStack(framework, language)) return 'react-ts';

  // 7. TypeScript Node backend (Nest / Express / Fastify / Hono)
  if (language === 'typescript' && framework !== null && NODE_TS_BACKEND_FRAMEWORKS.has(framework)) {
    return 'node-ts-backend';
  }

  // 8. Python
  if (language === 'python') return 'python';

  // 9. Go
  if (language === 'go') return 'go';

  // 10. Rust
  if (language === 'rust') return 'rust';

  // 11. Plain TypeScript (no framework)
  if (language === 'typescript' && framework === null) return 'typescript';

  // 12. Plain JavaScript (no framework)
  if (language === 'javascript' && framework === null) return 'javascript';

  // Known fallthrough cases that intentionally route to 'generic' (Epic 17 / non-goals):
  // - language === 'csharp' && framework === null (console .NET app)
  // - language === 'java' && framework === null (no Spring Boot marker)
  // - any unsupported language (kotlin, ruby, php, swift, ...) without a recognised framework

  // 13. Generic fallback
  return 'generic';
}

/**
 * Determine the implementer variant to use based on the detected stack.
 * Evaluation order matters — the first matching rule wins.
 */
export function getApplicableImplementerVariant(detected: DetectedStack): ImplementerVariant {
  return getApplicableImplementerVariantForStack({
    framework: detected.framework.value,
    language: detected.language.value,
  });
}
