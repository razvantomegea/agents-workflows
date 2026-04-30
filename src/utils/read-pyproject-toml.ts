import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists } from './file-exists.js';

export interface PyprojectToml {
  project?: {
    name?: string;
    description?: string;
    dependencies?: string[];
  };
  tool?: Record<string, unknown>;
}

/**
 * Reads and parses the `pyproject.toml` at the root of a Python project.
 *
 * @param projectRoot - Absolute path to the project directory. The file
 *   `pyproject.toml` is resolved as `<projectRoot>/pyproject.toml`.
 * @returns A promise that resolves to a {@link PyprojectToml} object
 *   containing the extracted `[project]` and `[tool.*]` sections, or `null`
 *   when:
 *   - No `pyproject.toml` exists at `projectRoot`.
 *   - The file cannot be read (e.g. permission error).
 *   - An unexpected error occurs during minimal TOML parsing.
 * @remarks Never throws. File-not-found and parse errors are caught
 *   internally and both cause a `null` return. Uses a hand-rolled minimal
 *   TOML parser — only `[project]`, `[project.dependencies]`, and
 *   `[tool.*]` sections are extracted. Full TOML spec compliance is not
 *   guaranteed. Uses {@link fileExists} to short-circuit before reading.
 */
export async function readPyprojectToml(
  projectRoot: string,
): Promise<PyprojectToml | null> {
  const filePath = join(projectRoot, 'pyproject.toml');
  if (!(await fileExists(filePath))) return null;

  try {
    const content = await readFile(filePath, 'utf-8');
    return parseMinimalToml(content);
  } catch {
    return null;
  }
}

function parseMinimalToml(content: string): PyprojectToml {
  const result: PyprojectToml = {};
  const lines = content.split('\n');
  let currentSection = '';
  let dependencyLines: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (dependencyLines) {
      dependencyLines.push(trimmed);
      if (trimmed.includes(']')) {
        if (!result.project) result.project = {};
        result.project.dependencies = parseDependencyArray(dependencyLines.join(' '));
        dependencyLines = null;
      }
      continue;
    }

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];

      if (currentSection.startsWith('tool.')) {
        if (!result.tool) result.tool = {};
        const toolName = currentSection.slice(5).split('.')[0];
        result.tool[toolName] = {};
      }
      continue;
    }

    if (currentSection === 'project') {
      if (!result.project) result.project = {};
      const kvMatch = trimmed.match(/^(\w+)\s*=\s*"(.+)"$/);
      if (kvMatch) {
        const [, key, value] = kvMatch;
        if (key === 'name') result.project.name = value;
        if (key === 'description') result.project.description = value;
      }
    }

    if (currentSection === 'project.dependencies' || currentSection === 'project') {
      const depMatch = trimmed.match(/^dependencies\s*=\s*\[(.+)\]$/);
      if (depMatch) {
        if (!result.project) result.project = {};
        result.project.dependencies = parseDependencyArray(depMatch[1]);
        continue;
      }

      if (/^dependencies\s*=\s*\[/.test(trimmed)) {
        dependencyLines = [trimmed];
        if (trimmed.includes(']')) {
          if (!result.project) result.project = {};
          result.project.dependencies = parseDependencyArray(dependencyLines.join(' '));
          dependencyLines = null;
        }
      }
    }
  }

  return result;
}

function parseDependencyArray(raw: string): string[] {
  return raw
    .replace(/^dependencies\s*=\s*\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((d) => d.trim().replace(/["']/g, '').split(/[>=<~!]/)[0].trim())
    .filter(Boolean);
}
