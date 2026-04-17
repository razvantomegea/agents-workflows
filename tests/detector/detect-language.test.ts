import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectLanguage } from '../../src/detector/detect-language.js';

describe('detectLanguage', () => {
  it('detects C# projects from arbitrary .csproj filenames', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'agents-csharp-'));

    try {
      await writeFile(join(projectRoot, 'AgentsWorkflows.csproj'), '<Project />', 'utf-8');
      await expect(detectLanguage(projectRoot)).resolves.toEqual({
        value: 'csharp',
        confidence: 0.85,
      });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
