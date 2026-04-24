import { detectAuth } from '../../src/detector/detect-auth.js';
import { withPackageJson } from './test-helpers.js';

const AUTH_PREFIX = 'agents-auth-';

describe('detectAuth', () => {
  it('detects known auth providers from dependencies', async () => {
    await withPackageJson({
      prefix: AUTH_PREFIX,
      dependencies: { '@clerk/nextjs': '^6.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectAuth(projectRoot);
        expect(result.value).toBe('clerk');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      },
    });
  });

  it('returns null when no auth dependency is present', async () => {
    await withPackageJson({
      prefix: AUTH_PREFIX,
      dependencies: { react: '^19.0.0' },
      callback: async (projectRoot: string) => {
        await expect(detectAuth(projectRoot)).resolves.toEqual({ value: null, confidence: 0 });
      },
    });
  });
});
