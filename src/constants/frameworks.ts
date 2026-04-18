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
