import { z } from 'zod';

export const stackConfigSchema = z.object({
  project: z.object({
    name: z.string(),
    description: z.string(),
    locale: z.string().default('en'),
    localeRules: z.array(z.string()).default([]),
    docsFile: z.string().nullable().default(null),
  }),

  stack: z.object({
    language: z.string(),
    runtime: z.string(),
    framework: z.string().nullable().default(null),
    uiLibrary: z.string().nullable().default(null),
    stateManagement: z.string().nullable().default(null),
    database: z.string().nullable().default(null),
    auth: z.string().nullable().default(null),
  }),

  tooling: z.object({
    packageManager: z.string(),
    packageManagerPrefix: z.string(),
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
    typeCheck: z.string().nullable().default(null),
    test: z.string(),
    lint: z.string().nullable().default(null),
    format: z.string().nullable().default(null),
    build: z.string().nullable().default(null),
    dev: z.string().nullable().default(null),
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

  monorepo: z.object({
    isRoot: z.boolean(),
    tool: z.enum(['pnpm', 'npm', 'yarn', 'lerna', 'turbo', 'nx']).nullable(),
    workspaces: z.array(z.string()),
  }).nullable().default(null),
});

export type StackConfig = z.infer<typeof stackConfigSchema>;
