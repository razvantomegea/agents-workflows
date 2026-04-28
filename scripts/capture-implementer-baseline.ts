import { mkdirSync, writeFileSync } from 'node:fs';
import { renderTemplate } from '../src/utils/template-renderer.js';
import { buildContext } from '../src/generator/build-context.js';
import { makeStackConfig } from '../tests/generator/fixtures.js';

async function main(): Promise<void> {
  const config = makeStackConfig({
    stack: { language: 'typescript', runtime: 'node', framework: 'nextjs', uiLibrary: 'tailwind', stateManagement: 'zustand', database: 'prisma', auth: null, i18nLibrary: null },
  });
  const ctx = buildContext(config);
  const rendered = await renderTemplate('agents/implementer-variants/generic.md.ejs', ctx);
  mkdirSync('tests/generator/__fixtures__', { recursive: true });
  writeFileSync('tests/generator/__fixtures__/implementer-generic-baseline.md', rendered, 'utf8');
  process.stdout.write(`Captured ${rendered.length} bytes\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${(err as Error).message}\n`);
  process.exit(1);
});
