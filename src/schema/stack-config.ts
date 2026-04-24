import { z } from 'zod';

const SAFE_COMMAND_RE = /^[a-zA-Z0-9 ._/:=@-]+$/;
const SAFE_COMMAND_MESSAGE = 'command contains disallowed shell metacharacters';
const SAFE_BRANCH_RE = /^[a-zA-Z0-9._/-]+$/;
const SAFE_BRANCH_MESSAGE = 'branch name contains disallowed shell metacharacters';
const SAFE_PROJECT_NAME_RE = /^[a-zA-Z0-9 ._-]+$/;
const SAFE_PROJECT_NAME_MESSAGE = 'project.name must contain only letters, digits, space, dot, underscore, hyphen';
const SAFE_PROJECT_NAME_WHITESPACE_MESSAGE = 'project.name cannot be empty or whitespace only';

const safeCommand = z.string().regex(SAFE_COMMAND_RE, SAFE_COMMAND_MESSAGE);
const safeCommandNullable = safeCommand.nullable().default(null);
const safeBranch = z.string().trim().min(1).regex(SAFE_BRANCH_RE, SAFE_BRANCH_MESSAGE);

export const stackConfigSchema = z.object({
  project: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .regex(SAFE_PROJECT_NAME_RE, SAFE_PROJECT_NAME_MESSAGE)
      .refine((value: string) => value.trim().length > 0, SAFE_PROJECT_NAME_WHITESPACE_MESSAGE),
    description: z.string(),
    locale: z.string().default('en'),
    localeRules: z.array(z.string()).default([]),
    docsFile: z.string().nullable().default(null),
    mainBranch: safeBranch.default('main'),
  }),

  stack: z.object({
    language: z.string(),
    runtime: z.string(),
    framework: z.string().nullable().default(null),
    uiLibrary: z.string().nullable().default(null),
    stateManagement: z.string().nullable().default(null),
    database: z.string().nullable().default(null),
    auth: z.string().nullable().default(null),
    i18nLibrary: z.string().nullable().default(null),
  }),

  tooling: z.object({
    packageManager: z.string(),
    packageManagerPrefix: z.union([z.literal(''), safeCommand]),
    testFramework: z.string(),
    testLibrary: z.string().nullable().default(null),
    e2eFramework: z.string().nullable().default(null),
    linter: z.string().nullable().default(null),
    formatter: z.string().nullable().default(null),
  }),

  paths: z.object({
    sourceRoot: z.string(),
    componentsDir: z.string().nullable().default(null),
    hooksDir: z.string().nullable().default(null),
    utilsDir: z.string(),
    testsDir: z.string().nullable().default(null),
    designTokensFile: z.string().nullable().default(null),
    i18nDir: z.string().nullable().default(null),
    testConfigFile: z.string().nullable().default(null),
  }),

  commands: z.object({
    typeCheck: safeCommandNullable,
    test: safeCommand,
    lint: safeCommandNullable,
    format: safeCommandNullable,
    build: safeCommandNullable,
    dev: safeCommandNullable,
  }),

  conventions: z.object({
    componentStyle: z.enum(['arrow', 'function', 'class']).default('arrow'),
    propsStyle: z.enum(['readonly', 'plain', 'interface']).default('readonly'),
    maxFileLength: z.number().default(200),
    testColocation: z.boolean().default(true),
    barrelExports: z.boolean().default(true),
    strictTypes: z.boolean().default(true),
  }),

  agents: z.object({
    architect: z.boolean().default(true),
    implementer: z.boolean().default(true),
    reactTsSenior: z.boolean().default(false),
    codeReviewer: z.boolean().default(true),
    securityReviewer: z.boolean().default(true),
    codeOptimizer: z.boolean().default(true),
    testWriter: z.boolean().default(true),
    e2eTester: z.boolean().default(false),
    reviewer: z.boolean().default(true),
    uiDesigner: z.boolean().default(true),
  }),

  selectedCommands: z.object({
    workflowPlan: z.boolean().default(true),
    workflowFix: z.boolean().default(true),
    externalReview: z.boolean().default(false),
    workflowLonghorizon: z.boolean().default(false),
    workflowTcr: z.boolean().default(false),
  }),

  targets: z.object({
    claudeCode: z.boolean().default(true),
    codexCli: z.boolean().default(false),
  }),

  detectedAiAgents: z.object({
    claudeCode: z.boolean().default(false),
    codexCli: z.boolean().default(false),
    cursor: z.boolean().default(false),
    aider: z.boolean().default(false),
    continueDev: z.boolean().default(false),
    copilot: z.boolean().default(false),
    windsurf: z.boolean().default(false),
    gemini: z.boolean().default(false),
  }).default({}),

  governance: z.object({
    enabled: z.boolean().default(false),
  }).default({ enabled: false }),

  monorepo: z.object({
    isRoot: z.boolean(),
    tool: z.enum(['pnpm', 'npm', 'yarn', 'lerna', 'turbo', 'nx']).nullable(),
    workspaces: z.array(z.string()),
  }).nullable().default(null),
});

export type StackConfig = z.infer<typeof stackConfigSchema>;
