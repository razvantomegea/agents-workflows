/**
 * Shared Zod validators used across stack-config.ts and workspace-stack.ts.
 * Import from this file to avoid circular dependencies.
 */
import { z } from 'zod';

const SAFE_COMMAND_RE = /^[a-zA-Z0-9 ._/:=@-]+$/;
const SAFE_COMMAND_MESSAGE = 'command contains disallowed shell metacharacters';

const SAFE_PROJECT_PATH_RE = /^[a-zA-Z0-9._/@+-]+$/;
const SAFE_PROJECT_PATH_MESSAGE =
  'path must be a relative project path using only letters, digits, slash, dot, underscore, at, plus, or hyphen';
const SAFE_PROJECT_PATH_TRAVERSAL_MESSAGE =
  'path must not be absolute, empty, contain parent traversal, or contain empty path segments';

export const safeCommand = z.string().regex(SAFE_COMMAND_RE, SAFE_COMMAND_MESSAGE);
export const safeCommandNullable = safeCommand.nullable().default(null);

export const safeProjectPath = z
  .string()
  .trim()
  .min(1)
  .regex(SAFE_PROJECT_PATH_RE, SAFE_PROJECT_PATH_MESSAGE)
  .refine((value: string) => {
    if (value.startsWith('/') || value.startsWith('.')) return false;
    const normalized = value.endsWith('/') ? value.slice(0, -1) : value;
    const segments = normalized.split('/');
    return segments.every(
      (segment: string) => segment !== '' && segment !== '.' && segment !== '..',
    );
  }, SAFE_PROJECT_PATH_TRAVERSAL_MESSAGE);
