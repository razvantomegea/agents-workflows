export const REACT_FRAMEWORKS = [
  'react',
  'nextjs',
  'expo',
  'react-native',
  'remix',
] as const;

export const FRONTEND_FRAMEWORKS = [
  ...REACT_FRAMEWORKS,
  'vue',
  'nuxt',
  'angular',
  'sveltekit',
] as const;

export const MOBILE_FRAMEWORKS = ['expo', 'react-native'] as const;

/**
 * Tests whether a framework slug is a member of the given allow-list.
 *
 * @param framework - Detected framework slug, or `null` when no framework was detected.
 * @param list - Allow-list of framework slugs to test membership against.
 * @returns `true` when `framework` is non-null and present in `list`; `false` otherwise.
 */
export function isFrameworkIn(
  framework: string | null,
  list: readonly string[],
): boolean {
  return framework !== null && list.includes(framework);
}

/**
 * Tests whether a framework is a frontend (browser-rendering) framework.
 *
 * @param framework - Detected framework slug, or `null`.
 * @returns `true` when `framework` is in `FRONTEND_FRAMEWORKS` (React family + Vue/Nuxt/Angular/SvelteKit).
 */
export function isFrontendFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, FRONTEND_FRAMEWORKS);
}

/**
 * Tests whether a framework belongs to the React family.
 *
 * @param framework - Detected framework slug, or `null`.
 * @returns `true` when `framework` is in `REACT_FRAMEWORKS` (react, nextjs, expo, react-native, remix).
 */
export function isReactFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, REACT_FRAMEWORKS);
}

/**
 * Tests whether the (framework, language) pair is the React + TypeScript stack.
 *
 * @param framework - Detected framework slug, or `null`.
 * @param language - Detected language label; matched case-insensitively after trimming.
 * @returns `true` when `framework` is React-family AND `language` normalizes to `'typescript'`.
 */
export function supportsReactTsStack(
  framework: string | null,
  language: string,
): boolean {
  return isReactFramework(framework) && language.trim().toLowerCase() === 'typescript';
}

/**
 * Tests whether a framework targets mobile platforms.
 *
 * @param framework - Detected framework slug, or `null`.
 * @returns `true` when `framework` is in `MOBILE_FRAMEWORKS` (expo, react-native).
 */
export function isMobileFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, MOBILE_FRAMEWORKS);
}

export const BACKEND_FRAMEWORKS = [
  'express',
  'fastify',
  'hono',
  'nestjs',
  'fastapi',
  'django',
  'flask',
  'spring-boot',
  'aspnetcore',
] as const;

export const BACKEND_FRAMEWORK_CONFIDENCE: Record<(typeof BACKEND_FRAMEWORKS)[number], number> = {
  express: 0.8,
  fastify: 0.85,
  hono: 0.85,
  nestjs: 0.95,
  fastapi: 0.9,
  django: 0.9,
  flask: 0.9,
  'spring-boot': 0.9,
  aspnetcore: 0.9,
};

/**
 * Tests whether a framework is a backend (server-side) framework.
 *
 * @param framework - Detected framework slug, or `null`.
 * @returns `true` when `framework` is in `BACKEND_FRAMEWORKS` (express, fastify, hono, nestjs, fastapi, django, flask, spring-boot, aspnetcore).
 */
export function isBackendFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, BACKEND_FRAMEWORKS);
}

export const FULLSTACK_JS_FRAMEWORKS = ['nextjs', 'nuxt', 'remix', 'sveltekit'] as const;

/**
 * Tests whether a framework is a fullstack JavaScript meta-framework.
 *
 * @param framework - Detected framework slug, or `null`.
 * @returns `true` when `framework` is in `FULLSTACK_JS_FRAMEWORKS` (nextjs, nuxt, remix, sveltekit).
 */
export function isFullstackJsFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, FULLSTACK_JS_FRAMEWORKS);
}
