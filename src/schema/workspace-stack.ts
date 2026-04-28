import { z } from 'zod';
import { safeProjectPath, safeCommand, safeCommandNullable } from './validators.js';

// Internal: re-export via stack-config.ts; tests should import from there.
export const workspaceStackSchema = z.object({
  path: safeProjectPath,
  language: z.string().trim().min(1, 'workspace language cannot be empty'),
  // nullable: null means runtime was not detected; consumers must handle null explicitly.
  runtime: z.string().nullable().default(null),
  framework: z.string().nullable().default(null),
  packageManager: z.string().trim().min(1, 'workspace packageManager cannot be empty'),
  commands: z.object({
    typeCheck: safeCommandNullable,
    test: safeCommand,
    lint: safeCommandNullable,
    build: safeCommandNullable,
  }),
});

export type WorkspaceStack = z.infer<typeof workspaceStackSchema>;
