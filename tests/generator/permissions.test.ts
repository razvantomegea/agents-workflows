import { buildPermissions } from '../../src/generator/permissions.js';

describe('buildPermissions', () => {
  it('emits glob and WebSearch for pnpm with glob-covered commands', () => {
    const perms = buildPermissions({
      tooling: { packageManagerPrefix: 'pnpm' },
      commands: { test: 'pnpm test', typeCheck: 'pnpm check-types', lint: 'pnpm lint' },
    });
    expect(perms).toEqual(['Bash(pnpm:*)', 'WebSearch']);
  });

  it('keeps commands that do not match the glob prefix', () => {
    const perms = buildPermissions({
      tooling: { packageManagerPrefix: 'pnpm' },
      commands: { test: 'pnpm test', typeCheck: 'mypy .', lint: 'ruff check .' },
    });
    expect(perms).toContain('Bash(pnpm:*)');
    expect(perms).toContain('WebSearch');
    expect(perms).toContain('Bash(mypy .)');
    expect(perms).toContain('Bash(ruff check .)');
    expect(perms).not.toContain('Bash(pnpm test)');
  });

  it('falls back to explicit command permissions when no prefix is set', () => {
    const perms = buildPermissions({
      tooling: { packageManagerPrefix: '' },
      commands: { test: 'go test ./...', typeCheck: 'go vet ./...', lint: null },
    });
    expect(perms).not.toContain('Bash(:*)');
    expect(perms).toContain('WebSearch');
    expect(perms).toContain('Bash(go test ./...)');
    expect(perms).toContain('Bash(go vet ./...)');
  });

  it('skips null commands', () => {
    const perms = buildPermissions({
      tooling: { packageManagerPrefix: 'npm run' },
      commands: { test: 'npm run test', typeCheck: null, lint: null },
    });
    expect(perms).toEqual(['Bash(npm run:*)', 'WebSearch']);
  });

  it('treats a command equal to the prefix as covered by the glob', () => {
    const perms = buildPermissions({
      tooling: { packageManagerPrefix: 'pnpm' },
      commands: { test: 'pnpm', typeCheck: null, lint: null },
    });
    expect(perms).toEqual(['Bash(pnpm:*)', 'WebSearch']);
  });
});
