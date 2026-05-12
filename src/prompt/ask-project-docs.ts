import { input } from '@inquirer/prompts';
import { safeProjectPath } from '../schema/stack-config.js';

export interface ProjectDocumentationFiles {
  docsFile: string | null;
  roadmapFile: string | null;
}

async function askOptionalProjectPath(
  params: Readonly<{ message: string; defaultValue: string | null }>,
): Promise<string | null> {
  const raw = await input({
    message: params.message,
    default: params.defaultValue ?? '',
    validate: (value: string): true | string => {
      const trimmed = value.trim();
      if (trimmed === '') return true;
      return safeProjectPath.safeParse(trimmed).success
        ? true
        : 'Use a relative project path without spaces, parent traversal, control characters, or markdown metacharacters.';
    },
  });
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Prompts for the primary documentation file and roadmap/PRD file paths.
 *
 * @param defaults - Pre-populated defaults derived from stack detection or the existing manifest.
 * @param defaults.docsFile - Default value for the docs file path prompt; may be `null`.
 * @param defaults.roadmapFile - Default value for the roadmap file path prompt; may be `null`.
 *
 * @returns An object with `docsFile` and `roadmapFile` — each is `null` when left blank.
 *
 * @remarks
 * Both paths are validated with `safeProjectPath`; blank input is allowed and normalised to `null`.
 * Shown in both the `init` prompt flow and the `update` prompt flow.
 * Skipped under `--yes` / `--no-prompt` / `--non-interactive` in `resolveUpdateProjectConfig`.
 */
export async function askProjectDocumentationFiles(
  defaults: Readonly<ProjectDocumentationFiles>,
): Promise<ProjectDocumentationFiles> {
  const docsFile = await askOptionalProjectPath({
    message: 'Primary documentation file (path relative to project root, blank to skip):',
    defaultValue: defaults.docsFile,
  });
  const roadmapFile = await askOptionalProjectPath({
    message: 'Roadmap/PRD file (path relative to project root, blank to skip):',
    defaultValue: defaults.roadmapFile,
  });

  return { docsFile, roadmapFile };
}

/**
 * Prompts for the primary git branch name used for new work (e.g., `main`, `master`, `develop`).
 *
 * @param defaultBranch - Pre-populated default; returned unchanged when the user submits blank input.
 *
 * @returns The trimmed branch name entered by the user, or `defaultBranch` when input is blank.
 *
 * @remarks
 * Validates that the branch name matches `[a-zA-Z0-9._/-]+`; rejects empty strings once trimmed.
 * Skipped under `--yes` / `--no-prompt` / `--non-interactive` in `resolveUpdateProjectConfig`.
 */
export async function askMainBranch(defaultBranch: string): Promise<string> {
  const trimmed = (await input({
    message: 'Primary branch for new work (main/master/trunk/develop/etc.):',
    default: defaultBranch,
    validate: (value: string): true | string => value.trim() === '' || /^[a-zA-Z0-9._/-]+$/.test(value.trim()) ? true : 'Use only letters, numbers, slash, dot, underscore, or hyphen.',
  })).trim();
  return trimmed === '' ? defaultBranch : trimmed;
}
