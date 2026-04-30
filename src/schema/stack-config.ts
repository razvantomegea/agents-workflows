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

const SAFE_BRANCH = z.string().trim().min(1).regex(SAFE_BRANCH_RE, SAFE_BRANCH_MESSAGE);
const SAFE_PROJECT_PATH_NULLABLE = safeProjectPath.nullable().default(null);

const SAFE_STACK_VALUE_RE = /^[a-zA-Z0-9 ._/+#-]+$/;
const SAFE_STACK_VALUE_MESSAGE =
  'stack/tooling values must contain only letters, digits, space, dot, underscore, slash, plus, hash, hyphen';
const SAFE_STACK_VALUE = z.string().trim().min(1).max(100).regex(SAFE_STACK_VALUE_RE, SAFE_STACK_VALUE_MESSAGE);
const SAFE_STACK_VALUE_NULLABLE = SAFE_STACK_VALUE.nullable().default(null);

function isSafeProjectDescription(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 31 || code === 127 || char === '`' || char === '<' || char === '>' || char === '#') {
      return false;
    }
  }
  return true;
}

export const SAFE_PROJECT_DESCRIPTION = z
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

export const STACK_CONFIG_SCHEMA = z.object({
  project: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .regex(SAFE_PROJECT_NAME_RE, SAFE_PROJECT_NAME_MESSAGE)
      .refine((value: string) => value.trim().length > 0, SAFE_PROJECT_NAME_WHITESPACE_MESSAGE),
    description: SAFE_PROJECT_DESCRIPTION,
    locale: z.string().default('en'),
    localeRules: z.array(z.string()).default([]),
    docsFile: SAFE_PROJECT_PATH_NULLABLE,
    roadmapFile: SAFE_PROJECT_PATH_NULLABLE,
    mainBranch: SAFE_BRANCH.default('main'),
  }),

  stack: z.object({
    language: SAFE_STACK_VALUE,
    runtime: SAFE_STACK_VALUE,
    framework: SAFE_STACK_VALUE_NULLABLE,
    uiLibrary: SAFE_STACK_VALUE_NULLABLE,
    stateManagement: SAFE_STACK_VALUE_NULLABLE,
    database: SAFE_STACK_VALUE_NULLABLE,
    auth: SAFE_STACK_VALUE_NULLABLE,
    i18nLibrary: SAFE_STACK_VALUE_NULLABLE,
  }),

  tooling: z.object({
    packageManager: SAFE_STACK_VALUE,
    packageManagerPrefix: z.union([z.literal(''), safeCommand]),
    testFramework: SAFE_STACK_VALUE,
    testLibrary: SAFE_STACK_VALUE_NULLABLE,
    e2eFramework: SAFE_STACK_VALUE_NULLABLE,
    linter: SAFE_STACK_VALUE_NULLABLE,
    formatter: SAFE_STACK_VALUE_NULLABLE,
  }),

  paths: z.object({
    sourceRoot: safeProjectPath,
    componentsDir: SAFE_PROJECT_PATH_NULLABLE,
    hooksDir: SAFE_PROJECT_PATH_NULLABLE,
    utilsDir: safeProjectPath,
    testsDir: SAFE_PROJECT_PATH_NULLABLE,
    designTokensFile: SAFE_PROJECT_PATH_NULLABLE,
    i18nDir: SAFE_PROJECT_PATH_NULLABLE,
    testConfigFile: SAFE_PROJECT_PATH_NULLABLE,
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

export const safeProjectDescription = SAFE_PROJECT_DESCRIPTION;
export const stackConfigSchema = STACK_CONFIG_SCHEMA;

export type StackConfig = z.infer<typeof STACK_CONFIG_SCHEMA>;
export type SecurityConfig = z.infer<typeof STACK_CONFIG_SCHEMA>['security'];
export { workspaceStackSchema } from './workspace-stack.js';
export type { WorkspaceStack } from './workspace-stack.js';
