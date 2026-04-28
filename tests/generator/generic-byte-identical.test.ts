import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from '@jest/globals';
import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';
import { IMPLEMENTER_CLAUDE_PATH } from './stack-aware-helpers.js';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * (g) Generic byte-identical.
 *
 * Verifies that the `generic` implementer variant renders output that is
 * byte-for-byte identical to the captured baseline file. The baseline was
 * produced by scripts/capture-implementer-baseline.ts against makeStackConfig()
 * with the default Next.js stack. If this test fails, the generic template
 * changed — update the baseline intentionally via the capture script.
 */
describe('(g) generic variant byte-identical to baseline', () => {
  it('makeStackConfig nextjs with implementerVariant: generic matches captured baseline', async () => {
    const baselinePath = join(CURRENT_DIR, '__fixtures__', 'implementer-generic-baseline.md');
    const baseline = await readFile(baselinePath, 'utf-8');

    const cfg = makeStackConfig({ agents: { implementerVariant: 'generic' } });
    const files = await generateAll(cfg);

    const impl = files.find((f) => f.path === IMPLEMENTER_CLAUDE_PATH);
    expect(impl).toBeDefined();
    expect(impl?.content).toBe(baseline);
  });
});
