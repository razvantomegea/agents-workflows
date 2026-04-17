import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectAuth } from '../../src/detector/detect-auth.js';

async function withPackageJson(
  dependencies: Record<string, string>,
  test: (projectRoot: string) => Promise<void>,
): Promise<void> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'agents-auth-'));
  try {
    await writeFile(
      join(projectRoot, 'package.json'),
      JSON.stringify({ dependencies }, null, 2),
      'utf-8',
    );
    await test(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

describe('detectAuth', () => {
  it('detects known auth providers from dependencies', async () => {
    await withPackageJson({ '@clerk/nextjs': '^6.0.0' }, async (projectRoot) => {
      const result = await detectAuth(projectRoot);
      expect(result.value).toBe('clerk');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  it('returns null when no auth dependency is present', async () => {
    await withPackageJson({ react: '^19.0.0' }, async (projectRoot) => {
      await expect(detectAuth(projectRoot)).resolves.toEqual({ value: null, confidence: 0 });
    });
  });
});
