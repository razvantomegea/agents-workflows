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

export function isFrameworkIn(
  framework: string | null,
  list: readonly string[],
): boolean {
  return framework !== null && list.includes(framework);
}

export function isFrontendFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, FRONTEND_FRAMEWORKS);
}

export function isReactFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, REACT_FRAMEWORKS);
}

export function supportsReactTsStack(
  framework: string | null,
  language: string,
): boolean {
  return isReactFramework(framework) && language.trim().toLowerCase() === 'typescript';
}

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

export function isBackendFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, BACKEND_FRAMEWORKS);
}

export const FULLSTACK_JS_FRAMEWORKS = ['nextjs', 'nuxt', 'remix', 'sveltekit'] as const;

export function isFullstackJsFramework(framework: string | null): boolean {
  return isFrameworkIn(framework, FULLSTACK_JS_FRAMEWORKS);
}
