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

  for (const line of lines) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];

      if (currentSection.startsWith('tool.')) {
        if (!result.tool) result.tool = {};
        const toolName = currentSection.slice(5);
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
        result.project.dependencies = depMatch[1]
          .split(',')
          .map((d) => d.trim().replace(/"/g, '').split(/[>=<~!]/)[0].trim());
      }
    }
  }

  return result;
}
