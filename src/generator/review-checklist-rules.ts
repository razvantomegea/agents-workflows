import type { StackConfig } from '../schema/stack-config.js';
import type { ReviewChecklistItem } from './types.js';

interface RuleDefinition extends ReviewChecklistItem {
  appliesWhen: string[];
}

const ALL_RULES: RuleDefinition[] = [
  {
    name: 'No `any`',
    howToVerify: 'Zero `any` in TypeScript — use explicit types, discriminated unions, or generics',
    severity: 'critical',
    appliesWhen: ['typescript'],
  },
  {
    name: 'DRY',
    howToVerify: 'Grep for existing equivalents before accepting new components/hooks/utils',
    severity: 'warning',
    appliesWhen: ['all'],
  },
  {
    name: 'Magic numbers',
    howToVerify: 'All spacing, sizing, and font sizes must reference design tokens or named constants',
    severity: 'warning',
    appliesWhen: ['frontend'],
  },
  {
    name: 'i18n compliance',
    howToVerify: 'Every user-facing string goes through i18n — no hardcoded strings in component files',
    severity: 'warning',
    appliesWhen: ['i18n'],
  },
  {
    name: 'Props typing',
    howToVerify: 'All component prop interfaces wrapped in `Readonly<>`',
    severity: 'warning',
    appliesWhen: ['react-readonly'],
  },
  {
    name: 'useCallback',
    howToVerify: 'All event handlers passed as props use `useCallback`',
    severity: 'warning',
    appliesWhen: ['react'],
  },
  {
    name: 'useMemo',
    howToVerify: 'Derived values from `.map()`, `.filter()`, `.reduce()` are wrapped in `useMemo`',
    severity: 'warning',
    appliesWhen: ['react'],
  },
  {
    name: 'File length',
    howToVerify: 'Flag files exceeding the max line limit — suggest splitting',
    severity: 'suggestion',
    appliesWhen: ['all'],
  },
  {
    name: 'JSX extraction',
    howToVerify: 'JSX blocks >30 lines inside render should be extracted to separate components',
    severity: 'suggestion',
    appliesWhen: ['react'],
  },
  {
    name: 'Object params',
    howToVerify: 'Functions with >2 parameters must use a single object parameter',
    severity: 'suggestion',
    appliesWhen: ['all'],
  },
  {
    name: 'UPPER_SNAKE_CASE constants',
    howToVerify: 'Module-level constants named in UPPER_SNAKE_CASE',
    severity: 'suggestion',
    appliesWhen: ['all'],
  },
  {
    name: 'No thin wrappers',
    howToVerify: 'Components that only forward props should use the underlying component directly',
    severity: 'suggestion',
    appliesWhen: ['react'],
  },
  {
    name: 'Descriptive names in .map()',
    howToVerify: 'Use descriptive variable names, not single-letter aliases',
    severity: 'suggestion',
    appliesWhen: ['all'],
  },
  {
    name: 'Test coverage',
    howToVerify: 'New utils, hooks, and stores must have corresponding test files',
    severity: 'warning',
    appliesWhen: ['all'],
  },
  {
    name: 'No redundant type aliases',
    howToVerify: 'Do not create `type Foo = string` when `string` can be used directly',
    severity: 'suggestion',
    appliesWhen: ['typescript'],
  },
  {
    name: 'Prisma query shape',
    howToVerify: 'Use `select`/`include` intentionally, avoid unbounded relation loading, and keep writes inside transactions when multiple records must change together',
    severity: 'warning',
    appliesWhen: ['prisma'],
  },
  {
    name: 'Drizzle schema alignment',
    howToVerify: 'Check Drizzle table definitions, inferred types, and migrations stay aligned with every query and mutation',
    severity: 'warning',
    appliesWhen: ['drizzle'],
  },
  {
    name: 'Zustand selector stability',
    howToVerify: 'Components select the smallest needed state slice and avoid creating new objects/functions inside selectors',
    severity: 'warning',
    appliesWhen: ['zustand'],
  },
  {
    name: 'TanStack Query keys',
    howToVerify: 'Query keys include every variable that affects fetched data, mutations invalidate or update relevant queries, and enabled states prevent invalid requests',
    severity: 'warning',
    appliesWhen: ['tanstack-query'],
  },
];

export function buildReviewChecklist(config: StackConfig): ReviewChecklistItem[] {
  const tags = buildApplicableTags(config);

  return ALL_RULES
    .filter((rule) => rule.appliesWhen.some((tag) => tags.has(tag)))
    .map(({ name, howToVerify, severity }) => ({ name, howToVerify, severity }));
}

function buildApplicableTags(config: StackConfig): Set<string> {
  const tags = new Set<string>(['all']);
  const { stack, conventions, project } = config;

  if (stack.language === 'typescript') tags.add('typescript');

  const reactFrameworks = ['react', 'nextjs', 'expo', 'react-native', 'remix'];
  if (reactFrameworks.includes(stack.framework)) {
    tags.add('react');
    tags.add('frontend');
    if (conventions.propsStyle === 'readonly') tags.add('react-readonly');
  }

  const frontendFrameworks = [...reactFrameworks, 'vue', 'nuxt', 'angular', 'sveltekit'];
  if (frontendFrameworks.includes(stack.framework)) tags.add('frontend');

  if (project.localeRules.length > 0) tags.add('i18n');
  if (stack.database) tags.add(stack.database);
  if (stack.stateManagement) tags.add(stack.stateManagement);

  return tags;
}
