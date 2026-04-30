import type { StackConfig, SecurityConfig, ImplementerVariant } from '../schema/stack-config.js';
import type { MergeFunction } from './write-file.js';
import type { PartialEntry } from './list-partials.js';

export interface CommandHook {
  type: 'command';
  command: string;
}

export interface PostToolUseHook {
  matcher: string;
  hooks: readonly CommandHook[];
}

export interface PreToolUseHook {
  matcher: string;
  hooks: readonly CommandHook[];
}

export interface ReviewChecklistItem {
  name: string;
  howToVerify: string;
  severity: 'critical' | 'warning' | 'suggestion';
}

export interface GeneratorContext extends Record<string, unknown> {
  project: StackConfig['project'];
  stack: StackConfig['stack'];
  tooling: StackConfig['tooling'];
  paths: StackConfig['paths'];
  commands: StackConfig['commands'];
  conventions: StackConfig['conventions'];
  detectedAiAgents: StackConfig['detectedAiAgents'];

  stackItems: string[];
  isTypescript: boolean;
  isReact: boolean;
  isMobile: boolean;
  isFrontend: boolean;
  isBackend: boolean;

  componentsDir: string | null;
  utilsDir: string;
  localeRules: string[];
  docsFile: string | null;
  roadmapFile: string | null;
  mainBranch: string;

  reviewChecklist: ReviewChecklistItem[];
  permissions: string[];
  denyList: readonly string[];
  allowedDomains: readonly string[];
  postToolUseHooks: readonly PostToolUseHook[];
  preToolUseHooks: readonly PreToolUseHook[];
  monorepo: StackConfig['monorepo'];

  isPolyglot: boolean;
  languages: string[];

  hasUiDesigner: boolean;
  hasE2eTester: boolean;
  hasSecurityReviewer: boolean;
  implementerVariant: ImplementerVariant;
  hasI18n: boolean;
  // Reserved for future template use; presently only hasI18n is consumed.
  i18nLibrary: StackConfig['stack']['i18nLibrary'];
  testFramework: string;
  testsDir: string | null;
  security: SecurityConfig;
  /**
   * Discovered partials, populated once by `generateAll()` so that
   * per-target generators (Cursor, Windsurf) skip their own filesystem
   * scans. Optional so callers that build a context outside `generateAll()`
   * (e.g. unit tests) can still let generators discover lazily.
   */
  discoveredPartials?: readonly PartialEntry[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  merge?: MergeFunction;
}
