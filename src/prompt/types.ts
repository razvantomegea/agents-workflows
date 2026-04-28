import type { SecurityConfig } from '../schema/stack-config.js';

export interface PromptAnswers {
  projectName: string;
  projectDescription: string;
  locale: string;
  localeRules: string[];
  language: string;
  runtime: string;
  framework: string;
  uiLibrary: string | null;
  stateManagement: string | null;
  database: string | null;
  packageManager: string;
  testFramework: string;
  e2eFramework: string | null;
  linter: string | null;
  formatter: string | null;
  sourceRoot: string;
  componentsDir: string | null;
  utilsDir: string;
  testColocation: boolean;
  barrelExports: boolean;
  strictTypes: boolean;
  selectedAgents: string[];
  selectedCommands: string[];
  claudeCode: boolean;
  codexCli: boolean;
  cursor: boolean;
  copilot: boolean;
  windsurf: boolean;
  security: SecurityConfig;
}
