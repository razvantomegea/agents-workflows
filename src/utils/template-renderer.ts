import ejs from 'ejs';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(MODULE_DIR, '..', 'templates');

export function jsonString(value: unknown): string {
  return JSON.stringify(value ?? '');
}

export function tomlString(value: unknown): string {
  const str = String(value ?? '');
  const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export async function renderTemplate(
  templatePath: string,
  data: Record<string, unknown>,
): Promise<string> {
  const fullPath = join(TEMPLATES_DIR, templatePath);
  const template = await readFile(fullPath, 'utf-8');

  const enrichedData = { ...data, jsonString, tomlString };
  const result = ejs.render(template, enrichedData, {
    async: false,
    filename: fullPath,
    root: TEMPLATES_DIR,
    views: [TEMPLATES_DIR],
    escape: identityEscape,
  });

  return result.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function identityEscape(value: unknown): string {
  return value == null ? '' : String(value);
}
