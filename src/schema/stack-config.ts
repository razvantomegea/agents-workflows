import { z } from 'zod';
import { safeCommand, safeCommandNullable, safeProjectPath } from './validators.js';
import { workspaceStackSchema } from './workspace-stack.js';
import { IMPLEMENTER_VARIANTS, migrateLegacyAgents } from './implementer-variants.js';

export { IMPLEMENTER_VARIANTS, migrateLegacyAgents } from './implementer-variants.js';
export type { ImplementerVariant } from './implementer-variants.js';
export { safeCommand, safeCommandNullable, safeProjectPath } from './validators.js';

export const ISOLATION_CHOICES = [
  'devcontainer',
  'docker',
  'vm',
  'vps',
  'clean-machine',
  'host-os',
] as const;

export type IsolationChoice = (typeof ISOLATION_CHOICES)[number];

const SAFE_BRANCH_RE = /^[a-zA-Z0-9._/-]+$/;
const SAFE_BRANCH_MESSAGE = 'branch name contains disallowed shell metacharacters';
const SAFE_PROJECT_NAME_RE = /^[a-zA-Z0-9 ._-]+$/;
const SAFE_PROJECT_NAME_MESSAGE = 'project.name must contain only letters, digits, space, dot, underscore, hyphen';
const SAFE_PROJECT_NAME_WHITESPACE_MESSAGE = 'project.name cannot be empty or whitespace only';
const SAFE_PROJECT_DESCRIPTION_MESSAGE = 'project.description must contain only plain single-line text characters';

const safeBranch = z.string().trim().min(1).regex(SAFE_BRANCH_RE, SAFE_BRANCH_MESSAGE);
const safeProjectPathNullable = safeProjectPath.nullable().default(null);

function isSafeProjectDescription(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 31 || code === 127 || char === '`' || char === '<' || char === '>' || char === '#') {
      return false;
    }
  }
  return true;
}

export const safeProjectDescription = z
  .string()
  .trim()
  .min(1, 'project.description cannot be empty')
  .max(500, 'project.description must be <= 500 characters')
  .refine(isSafeProjectDescription, SAFE_PROJECT_DESCRIPTION_MESSAGE);

export const SECURITY_DEFAULTS = {
  nonInteractiveMode: false,
  runsIn: null,
  disclosureAcknowledgedAt: null,
} satisfies {
  nonInteractiveMode: boolean;
  runsIn: IsolationChoice | null;
  disclosureAcknowledgedAt: string | null;
};

export const stackConfigSchema = z.object({
  project: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .regex(SAFE_PROJECT_NAME_RE, SAFE_PROJECT_NAME_MESSAGE)
      .refine((value: string) => value.trim().length > 0, SAFE_PROJECT_NAME_WHITESPACE_MESSAGE),
    description: safeProjectDescription,
    locale: z.string().default('en'),
    localeRules: z.array(z.string()).default([]),
    docsFile: safeProjectPathNullable,
    roadmapFile: safeProjectPathNullable,
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
    sourceRoot: safeProjectPath,
    componentsDir: safeProjectPathNullable,
    hooksDir: safeProjectPathNullable,
    utilsDir: safeProjectPath,
    testsDir: safeProjectPathNullable,
    designTokensFile: safeProjectPathNullable,
    i18nDir: safeProjectPathNullable,
    testConfigFile: safeProjectPathNullable,
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
    testColocation: z.boolean().default(true),
    barrelExports: z.boolean().default(true),
    strictTypes: z.boolean().default(true),
  }),

  agents: z.preprocess(
    migrateLegacyAgents,
    z.object({
      architect: z.boolean().default(true),
      implementer: z.boolean().default(true),
      implementerVariant: z.enum(IMPLEMENTER_VARIANTS).default('generic'),
      codeReviewer: z.boolean().default(true),
      securityReviewer: z.boolean().default(true),
      codeOptimizer: z.boolean().default(true),
      testWriter: z.boolean().default(true),
      e2eTester: z.boolean().default(false),
      reviewer: z.boolean().default(true),
      uiDesigner: z.boolean().default(true),
    }),
  ),

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
    cursor: z.boolean().default(false),
    copilot: z.boolean().default(false),
    windsurf: z.boolean().default(false),
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

  languages: z.array(z.string()).default([]),

  monorepo: z.object({
    isRoot: z.boolean(),
    tool: z.enum(['pnpm', 'npm', 'yarn', 'lerna', 'turbo', 'nx', 'cargo', 'go-work', 'uv', 'poetry', 'dotnet-sln', 'cmake']).nullable(),
    // Why: pre-T3 manifests serialised workspaces as string[]. The preprocess drops those legacy
    // string entries so update-command never fails to parse an old manifest. The next init/update
    // re-derives workspaces via detectStack and repopulates with WorkspaceStack objects.
    workspaces: z.preprocess(
      (val) => {
        if (!Array.isArray(val)) return val;
        if (val.every((item) => typeof item === 'string')) return [];
        return val;
      },
      z.array(workspaceStackSchema).default([]),
    ),
  }).nullable().default(null),

  security: z.object({
    nonInteractiveMode: z.boolean().default(false),
    runsIn: z.enum(ISOLATION_CHOICES).nullable().default(null),
    disclosureAcknowledgedAt: z.string().datetime().nullable().default(null),
  }).default(() => ({ ...SECURITY_DEFAULTS })),

  plugins: z.object({
    superpowers: z.boolean().default(false),
    caveman: z.boolean().default(false),
    claudeMdManagement: z.boolean().default(false),
    featureDev: z.boolean().default(false),
    codeReviewPlugin: z.boolean().default(false),
    codeSimplifier: z.boolean().default(false),
  }).default({}),

  cavemanStyle: z.boolean().default(false),
});

export type StackConfig = z.infer<typeof stackConfigSchema>;
export type SecurityConfig = z.infer<typeof stackConfigSchema>['security'];
export { workspaceStackSchema } from './workspace-stack.js';
export type { WorkspaceStack } from './workspace-stack.js';
