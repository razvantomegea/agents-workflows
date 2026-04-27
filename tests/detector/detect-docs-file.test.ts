import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectDocsFile } from '../../src/detector/detect-docs-file.js';

async function makeProjectRoot(files: string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'agents-workflows-docs-'));
  for (const filename of files) {
    await writeFile(join(root, filename), `# ${filename}\n`, 'utf-8');
  }
  return root;
}

describe('detectDocsFile', () => {
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

  it('returns null detection when no doc file exists', async () => {
    const root = await setup([]);
    const result = await detectDocsFile(root);
    expect(result).toEqual({ value: null, confidence: 0 });
  });

  it('picks README.md when it is the only candidate', async () => {
    const root = await setup(['README.md']);
    const result = await detectDocsFile(root);
    expect(result.value).toBe('README.md');
    expect(result.confidence).toBeCloseTo(0.9);
  });

  it('prefers README.md over PRD.md', async () => {
    const root = await setup(['README.md', 'PRD.md']);
    const result = await detectDocsFile(root);
    expect(result.value).toBe('README.md');
    expect(result.confidence).toBeCloseTo(0.9);
  });

  it('prefers ARCHITECTURE.md over DOCS.md and PRD.md when README is absent', async () => {
    const root = await setup(['PRD.md', 'DOCS.md', 'ARCHITECTURE.md']);
    const result = await detectDocsFile(root);
    expect(result.value).toBe('ARCHITECTURE.md');
    expect(result.confidence).toBeCloseTo(0.85);
  });

  it('prefers DOCS.md over PRD.md when README and ARCHITECTURE are absent', async () => {
    const root = await setup(['PRD.md', 'DOCS.md']);
    const result = await detectDocsFile(root);
    expect(result.value).toBe('DOCS.md');
    expect(result.confidence).toBeCloseTo(0.8);
  });

  it('falls back to PRD.md when no other doc file exists', async () => {
    const root = await setup(['PRD.md']);
    const result = await detectDocsFile(root);
    expect(result.value).toBe('PRD.md');
    expect(result.confidence).toBeCloseTo(0.7);
  });
});
