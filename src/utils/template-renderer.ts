import ejs from 'ejs';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(MODULE_DIR, '..', 'templates');

export async function renderTemplate(
  templatePath: string,
  data: Record<string, unknown>,
): Promise<string> {
  const fullPath = join(TEMPLATES_DIR, templatePath);
  const template = await readFile(fullPath, 'utf-8');

  const result = await ejs.render(template, data, {
    async: true,
    filename: fullPath,
    root: TEMPLATES_DIR,
    views: [TEMPLATES_DIR],
  });

  return result.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
