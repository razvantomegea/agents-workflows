import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig, getContent } from './fixtures.js';

const IMPLEMENTER_PATH = '.claude/agents/implementer.md';

describe('Epic 8 T5 — continuous profiling expansion in observability partial', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('implementer.md contains eBPF profiling reference', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('eBPF');
  });

  it('implementer.md contains OpenTelemetry profiles signal reference', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('OpenTelemetry profiles signal');
  });

  it('implementer.md contains at least one OSS profiler implementation name', () => {
    const content = getContent(files, IMPLEMENTER_PATH);
    const hasOssProfiler =
      content.includes('Pyroscope') ||
      content.includes('Parca') ||
      content.includes('Polar Signals');
    expect(hasOssProfiler).toBe(true);
  });

  it('implementer.md contains 100 Hz default sample-rate guidance', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('100 Hz');
  });

  it('implementer.md mentions CPU flame graphs profile type', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('CPU flame graphs');
  });

  it('implementer.md mentions heap allocations profile type', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('heap');
  });

  it('implementer.md warns about PII-safe stack symbolisation', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('PII-safe');
  });
});
