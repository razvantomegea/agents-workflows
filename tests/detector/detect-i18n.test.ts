import { detectI18n } from '../../src/detector/detect-i18n.js';
import { withPackageJson } from './test-helpers.js';

const I18N_PREFIX = 'agents-i18n-';

describe('detectI18n', () => {
  it('detects i18next with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { i18next: '^23.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('i18next');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects react-i18next with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { 'react-i18next': '^14.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('react-i18next');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects next-intl with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { 'next-intl': '^3.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('next-intl');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects next-translate with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { 'next-translate': '^2.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('next-translate');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects @lingui/core with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { '@lingui/core': '^4.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('@lingui/core');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects @lingui/react with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { '@lingui/react': '^4.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('@lingui/react');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('prefers @lingui/core over @lingui/react when both are present', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { '@lingui/core': '^4.0.0', '@lingui/react': '^4.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('@lingui/core');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects vue-i18n with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { 'vue-i18n': '^9.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('vue-i18n');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects svelte-i18n with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { 'svelte-i18n': '^4.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('svelte-i18n');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects @nuxtjs/i18n with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { '@nuxtjs/i18n': '^8.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('@nuxtjs/i18n');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects react-intl with confidence 0.9', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { 'react-intl': '^6.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('react-intl');
        expect(result.confidence).toBe(0.9);
      },
    });
  });

  it('detects @formatjs/intl with lower confidence 0.8', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { '@formatjs/intl': '^3.0.0' },
      callback: async (projectRoot: string) => {
        const result = await detectI18n(projectRoot);
        expect(result.value).toBe('@formatjs/intl');
        expect(result.confidence).toBe(0.8);
      },
    });
  });

  it('returns null when no i18n dependency is present', async () => {
    await withPackageJson({
      prefix: I18N_PREFIX,
      dependencies: { react: '^19.0.0' },
      callback: async (projectRoot: string) => {
        await expect(detectI18n(projectRoot)).resolves.toEqual({ value: null, confidence: 0 });
      },
    });
  });
});
