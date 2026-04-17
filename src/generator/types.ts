import type { StackConfig } from '../schema/stack-config.js';

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

  reviewChecklist: ReviewChecklistItem[];

  hasUiDesigner: boolean;
  hasE2eTester: boolean;
  testFramework: string;
  testsDir: string | null;
}

export interface GeneratedFile {
  path: string;
  content: string;
}
