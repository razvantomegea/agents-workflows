import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectMonorepo, detectStack, resolveRuntime } from '../../src/detector/detect-stack.js';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(CURRENT_DIR, '..', 'fixtures');

describe('detectStack', () => {
  it('detects React Native Expo project', async () => {
    const result = await detectStack(join(FIXTURES_DIR, 'react-native-expo'));

    expect(result.language.value).toBe('typescript');
    expect(result.language.confidence).toBeGreaterThanOrEqual(0.9);

    expect(result.framework.value).toBe('expo');
    expect(result.framework.confidence).toBeGreaterThanOrEqual(0.9);

    expect(result.uiLibrary.value).toBe('tamagui');
    expect(result.stateManagement.value).toBe('zustand');
    expect(result.database.value).toBe('supabase');
    expect(result.auth.value).toBe('supabase-auth');
    expect(result.testFramework.value).toBe('jest');
    expect(result.testLibrary.value).toBe('react-native-testing-library');
    expect(result.linter.value).toBe('oxlint');
    expect(result.formatter.value).toBe('prettier');

    expect(result.runtime.value).toBe('react-native');
  });

  it('detects Next.js project', async () => {
    const result = await detectStack(join(FIXTURES_DIR, 'nextjs-app'));

    expect(result.language.value).toBe('typescript');
    expect(result.framework.value).toBe('nextjs');
    expect(result.uiLibrary.value).toBe('tailwind');
    expect(result.stateManagement.value).toBe('zustand');
    expect(result.database.value).toBe('prisma');
    expect(result.testFramework.value).toBe('vitest');
    expect(result.testLibrary.value).toBe('react-testing-library');
    expect(result.e2eFramework.value).toBe('playwright');
    expect(result.linter.value).toBe('eslint');
    expect(result.formatter.value).toBe('prettier');
  });

  it('detects Python FastAPI project', async () => {
    const result = await detectStack(join(FIXTURES_DIR, 'python-fastapi'));

    expect(result.language.value).toBe('python');
    expect(result.framework.value).toBe('fastapi');
    expect(result.database.value).toBe('sqlalchemy');
    expect(result.testFramework.value).toBe('pytest');
    expect(result.runtime.value).toBe('python');
  });

  it('resolves runtime from language and framework', () => {
    expect(resolveRuntime('typescript', 'nextjs')).toEqual({ value: 'node', confidence: 0.85 });
    expect(resolveRuntime('csharp', null)).toEqual({ value: 'dotnet', confidence: 0.85 });
    expect(resolveRuntime('typescript', 'expo')).toEqual({ value: 'react-native', confidence: 0.9 });
    expect(resolveRuntime(null, null)).toEqual({ value: null, confidence: 0 });
  });

  it('detects package workspaces as monorepos', async () => {
    await expect(detectMonorepo(join(FIXTURES_DIR, 'nextjs-app'))).resolves.toBe(false);
  });

  it('returns nulls for empty directory', async () => {
    const result = await detectStack(join(FIXTURES_DIR, 'nonexistent'));

    expect(result.language.value).toBeNull();
    expect(result.framework.value).toBeNull();
    expect(result.database.value).toBeNull();
  });
});
