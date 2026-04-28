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

export function escapeYamlString(value: string): string {
  const slashEscaped = value.replace(/\\/g, '\\\\');
  const quoteEscaped = slashEscaped.replace(/"/g, '\\"');
  return escapeAllControlChars(quoteEscaped);
}

export function renderYamlGlobsList(globs: readonly string[]): string {
  return globs.map((glob: string) => `  - "${escapeYamlString(glob)}"`).join('\n');
}
