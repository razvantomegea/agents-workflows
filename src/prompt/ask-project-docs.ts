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

export async function askMainBranch(defaultBranch: string): Promise<string> {
  const trimmed = (await input({
    message: 'Primary branch for new work (main/master/trunk/develop/etc.):',
    default: defaultBranch,
    validate: (value: string): true | string => value.trim() === '' || /^[a-zA-Z0-9._/-]+$/.test(value.trim()) ? true : 'Use only letters, numbers, slash, dot, underscore, or hyphen.',
  })).trim();
  return trimmed === '' ? defaultBranch : trimmed;
}
