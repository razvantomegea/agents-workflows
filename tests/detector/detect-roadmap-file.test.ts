import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectRoadmapFile } from '../../src/detector/detect-roadmap-file.js';

async function makeProjectRoot(files: string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'agents-workflows-roadmap-'));
  for (const filename of files) {
    await writeFile(join(root, filename), `# ${filename}\n`, 'utf-8');
  }
  return root;
}

describe('detectRoadmapFile', () => {
  const created: string[] = [];

  afterEach(async () => {
    while (created.length) {
      const path = created.pop();
      if (path) await rm(path, { recursive: true, force: true });
    }
  });

  async function setup(files: string[]): Promise<string> {
    const root = await makeProjectRoot(files);
    created.push(root);
    return root;
  }

  it('returns null detection when PRD.md is absent', async () => {
    const root = await setup([]);
    const result = await detectRoadmapFile(root);
    expect(result).toEqual({ value: null, confidence: 0 });
  });

  it('returns PRD.md when it exists', async () => {
    const root = await setup(['PRD.md']);
    const result = await detectRoadmapFile(root);
    expect(result.value).toBe('PRD.md');
    expect(result.confidence).toBeCloseTo(0.9);
  });

  it('does not pick README.md as a roadmap fallback', async () => {
    const root = await setup(['README.md']);
    const result = await detectRoadmapFile(root);
    expect(result).toEqual({ value: null, confidence: 0 });
  });

  it('does not pick ARCHITECTURE.md or DOCS.md as roadmap fallbacks', async () => {
    const root = await setup(['ARCHITECTURE.md', 'DOCS.md']);
    const result = await detectRoadmapFile(root);
    expect(result).toEqual({ value: null, confidence: 0 });
  });
});
