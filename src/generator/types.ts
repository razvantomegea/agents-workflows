import type { StackConfig } from '../schema/stack-config.js';

export interface PostToolUseHook {
  matcher: string;
  command: string;
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

  componentsDir: string | null;
  utilsDir: string;
  localeRules: string[];
  docsFile: string | null;

  reviewChecklist: ReviewChecklistItem[];
  permissions: string[];
  denyList: readonly string[];
  postToolUseHooks: readonly PostToolUseHook[];
  monorepo: StackConfig['monorepo'];

  hasUiDesigner: boolean;
  hasE2eTester: boolean;
  hasSecurityReviewer: boolean;
  hasReactTsSenior: boolean;
  testFramework: string;
  testsDir: string | null;
}

export interface GeneratedFile {
  path: string;
  content: string;
}
