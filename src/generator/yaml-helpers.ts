function escapeControlChar(c: string): string {
  return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
}

function escapeAllControlChars(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      out += escapeControlChar(value.charAt(i));
    } else {
      out += value.charAt(i);
    }
  }
  return out;
}

/**
 * Escapes a string for safe use as a double-quoted YAML scalar value.
 *
 * Applies three passes:
 * 1. Backslash-escapes all `\` characters.
 * 2. Backslash-escapes all `"` characters.
 * 3. Replaces all ASCII control characters (U+0000–U+001F and U+007F) with
 *    `\uXXXX` Unicode escape sequences.
 *
 * The result is safe to embed verbatim between double-quote delimiters in a
 * YAML document without breaking the scalar boundary.
 *
 * @param value - The raw string to escape.
 * @returns The escaped string suitable for inclusion as `"<value>"` in YAML.
 */
export function escapeYamlString(value: string): string {
  const slashEscaped = value.replace(/\\/g, '\\\\');
  const quoteEscaped = slashEscaped.replace(/"/g, '\\"');
  return escapeAllControlChars(quoteEscaped);
}

/**
 * Renders a list of glob patterns as an indented YAML sequence of
 * double-quoted strings.
 *
 * Each glob is escaped with `escapeYamlString` and wrapped in double quotes,
 * then prefixed with two spaces and a YAML list marker (`- `).  Lines are
 * joined with newline characters.
 *
 * @param globs - Ordered list of glob patterns to render.
 * @returns A multi-line YAML block fragment suitable for embedding directly
 *   under a `globs:` key in a `.mdc` or Windsurf rule header.
 */
export function renderYamlGlobsList(globs: readonly string[]): string {
  return globs.map((glob: string) => `  - "${escapeYamlString(glob)}"`).join('\n');
}
