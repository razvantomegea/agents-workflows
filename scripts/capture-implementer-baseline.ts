import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from '../src/utils/template-renderer.js';
import { buildContext } from '../src/generator/build-context.js';
import { makeStackConfig } from '../tests/generator/fixtures.js';

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const fixturePath = join(scriptDir, '..', 'tests', 'generator', '__fixtures__', 'implementer-generic-baseline.md');

  const config = makeStackConfig({
    stack: { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: 'tailwind', stateManagement: 'zustand', database: 'prisma', auth: null, i18nLibrary: null },
    agents: { implementerVariant: 'generic' },
  });
  const ctx = buildContext(config);
  const rendered = await renderTemplate('agents/implementer-variants/generic.md.ejs', ctx);
  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, rendered, 'utf8');
  process.stdout.write(`Captured ${rendered.length} bytes\n`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
