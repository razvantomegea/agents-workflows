import { createDependencyDetector } from './dependency-detector.js';

export const detectI18n = createDependencyDetector([
  { packages: ['i18next'], value: 'i18next', confidence: 0.9 },
  { packages: ['react-i18next'], value: 'react-i18next', confidence: 0.9 },
  { packages: ['next-intl'], value: 'next-intl', confidence: 0.9 },
  { packages: ['next-translate'], value: 'next-translate', confidence: 0.9 },
  { packages: ['@lingui/core'], value: '@lingui/core', confidence: 0.9 },
  { packages: ['@lingui/react'], value: '@lingui/react', confidence: 0.9 },
  { packages: ['vue-i18n'], value: 'vue-i18n', confidence: 0.9 },
  { packages: ['svelte-i18n'], value: 'svelte-i18n', confidence: 0.9 },
  { packages: ['@nuxtjs/i18n'], value: '@nuxtjs/i18n', confidence: 0.9 },
  { packages: ['react-intl'], value: 'react-intl', confidence: 0.9 },
  { packages: ['@formatjs/intl'], value: '@formatjs/intl', confidence: 0.8 },
]);
