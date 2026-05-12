import ejs from 'ejs';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(MODULE_DIR, '..', 'templates');

function jsonString(value: unknown): string {
  return JSON.stringify(value ?? '');
}

function tomlString(value: unknown): string {
  const str = String(value ?? '');
  const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Serializes a value as a safe inline Markdown code span.
 *
 * @param value - The value to serialize. Converted to string via `String(value ?? '')`.
 *   Control characters (U+0000–U+0008, U+000B–U+000C, U+000E–U+001F, U+007F) and
 *   newline/carriage-return sequences are stripped or collapsed to a space to
 *   prevent log injection and multi-line code span breakage.
 * @returns A single-line Markdown code span: `` `value` `` when the value contains
 *   no backtick characters, or ` `` value `` ` (double-backtick form with backticks
 *   replaced by apostrophes) when backticks are present.
 * @remarks Pure function; exported for use in tests and downstream sanitization
 *   utilities. Injected into every EJS template context by {@link renderTemplate}.
 */
export function markdownCode(value: unknown): string {
  const normalized = String(value ?? '')
    // eslint-disable-next-line no-control-regex -- reason: strip control chars for security
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\r\n]+/g, ' ');
  if (!normalized.includes('`')) return `\`${normalized}\``;
  return `\`\` ${normalized.replace(/`/g, "'")} \`\``;
}

/**
 * Serializes a value as safe inline Markdown text with HTML entity escaping.
 *
 * @param value - The value to serialize. Converted to string via `String(value ?? '')`.
 *   Control characters are stripped. Backslashes, backticks, `&`, `<`, `>`,
 *   and newline sequences are escaped or replaced so the output is safe for
 *   use inside a Markdown paragraph or table cell.
 * @returns A single-line string with:
 *   - Control chars removed.
 *   - `\` → `\\`, `` ` `` → `` \` ``, `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`.
 *   - Newlines and carriage returns collapsed to a single space.
 * @remarks Pure function; exported for use in tests and downstream sanitization
 *   utilities. Injected into every EJS template context by {@link renderTemplate}.
 */
export function markdownText(value: unknown): string {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex -- reason: strip control chars for security
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\r\n]+/g, ' ');
}

/**
 * Reads and renders an EJS template from the bundled `src/templates/` directory.
 *
 * @param templatePath - Path relative to the `src/templates/` root (e.g.
 *   `"agents/reviewer.md.ejs"`). Resolved against the compiled module's
 *   `TEMPLATES_DIR` constant — do not supply an absolute path.
 * @param data - Template variables passed to EJS as the render context.
 *   The following helper functions are automatically injected and available
 *   in every template without being listed in `data`:
 *   - `jsonString(v)` — serializes `v` as a JSON string literal.
 *   - `tomlString(v)` — serializes `v` as a TOML double-quoted string.
 *   - `markdownCode(v)` — wraps `v` in a safe Markdown inline code span.
 *   - `markdownText(v)` — HTML-entity-escapes `v` for Markdown body text.
 * @returns A promise that resolves to the rendered string with leading/trailing
 *   whitespace trimmed, consecutive blank lines collapsed to a single blank
 *   line, and a single trailing newline appended.
 * @throws {Error} If the template file does not exist or cannot be read
 *   (`readFile` rejects).
 * @throws {Error} If EJS encounters a render error (e.g. undefined variable,
 *   syntax error in the template).
 * @throws {Error} If the template contains `await` or async EJS expressions —
 *   EJS is invoked with `async: false`; asynchronous template constructs are
 *   not supported and will cause a runtime error.
 * @remarks Performs one FS read per call (not cached). The EJS `root` and
 *   `views` option is set to `TEMPLATES_DIR`, so `<%- include('...') %>`
 *   paths are resolved relative to that directory. Output encoding: all
 *   template output passes through an identity escape function to prevent
 *   double-escaping.
 */
export async function renderTemplate(
  templatePath: string,
  data: Record<string, unknown>,
): Promise<string> {
  const fullPath = join(TEMPLATES_DIR, templatePath);
  const template = await readFile(fullPath, 'utf-8');

  const enrichedData = { ...data, jsonString, tomlString, markdownCode, markdownText };
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
