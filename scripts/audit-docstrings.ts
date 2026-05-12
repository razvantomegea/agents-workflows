/**
 * CLI entrypoint — emits a CSV inventory of all exported functions/arrows/methods
 * under src/ with their docstring coverage.
 *
 * Usage: pnpm tsx scripts/audit-docstrings.ts > docs/docstring-audit.csv
 *
 * CSV columns: file,exportName,kind,hasDocstring,line,lineCount
 * Identifiers in this project do not contain commas or quotes,
 * so no CSV escaping is needed for value columns.
 */
import { auditDocstrings } from './lib/docstring-audit.js';

const entries = auditDocstrings({ rootDir: 'src' });

const HEADER = 'file,exportName,kind,hasDocstring,line,lineCount';
const rows = entries.map(
  (e) => `${e.file},${e.exportName},${e.kind},${e.hasDocstring},${e.line},${e.lineCount}`,
);

process.stdout.write([HEADER, ...rows].join('\n') + '\n');
