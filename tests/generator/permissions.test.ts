import { buildPermissions, buildDenyList, buildPostToolUseHooks } from '../../src/generator/permissions.js';

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

describe('buildDenyList', () => {
  it('returns the 20 documented deny patterns in order', () => {
    const deny = buildDenyList();
    expect(deny).toHaveLength(20);
    expect(deny[0]).toBe('Bash(rm -rf:*)');
    expect(deny).toContain('Bash(git push --force:*)');
    expect(deny).toContain('Edit(.env*)');
    expect(deny).toContain('Edit(migrations/**)');
    expect(deny[19]).toBe('Edit(migrations/**)');
    expect(deny).toContain('Bash(git push --force-with-lease:*)');
    expect(deny).toContain('Bash(rm --recursive:*)');
    expect(deny).toContain('Bash(rm --force:*)');
    expect(deny).toContain('Bash(git clean -f:*)');
  });

  it('returns a fresh copy each call', () => {
    const a = buildDenyList();
    const b = buildDenyList();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('buildPostToolUseHooks', () => {
  it('emits a lint --fix hook when lintCommand is provided', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'pnpm lint' });
    expect(hooks).toEqual([{ matcher: 'Edit|Write', command: 'pnpm lint --fix || true' }]);
  });

  it('returns an empty array when lintCommand is null', () => {
    expect(buildPostToolUseHooks({ lintCommand: null })).toEqual([]);
  });

  it('does not double-append --fix when already present', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'pnpm lint --fix' });
    expect(hooks[0].command).toBe('pnpm lint --fix || true');
  });

  it('appends --fix even when command contains fix as a substring without flag', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'pnpm prefix-fix' });
    expect(hooks[0].command).toBe('pnpm prefix-fix --fix || true');
  });
});
