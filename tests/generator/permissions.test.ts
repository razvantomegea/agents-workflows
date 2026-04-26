import {
  buildPermissions,
  buildDenyList,
  buildPostToolUseHooks,
  LOCAL_GIT_ALLOWS,
  TOOLCHAIN_ALLOWS,
  DENY_PATTERNS,
} from '../../src/generator/permissions.js';

const PNPM_INPUT = {
  tooling: { packageManagerPrefix: 'pnpm' },
  commands: { test: 'pnpm test', typeCheck: 'pnpm check-types', lint: 'pnpm lint' },
};

describe('buildPermissions', () => {
  it('emits workspace globs, pnpm glob, and WebSearch for a pnpm stack', () => {
    const perms = buildPermissions(PNPM_INPUT);
    expect(perms).toContain('Edit(./**)');
    expect(perms).toContain('MultiEdit(./**)');
    expect(perms).toContain('Write(./**)');
    expect(perms).toContain('Bash(pnpm:*)');
    expect(perms).toContain('WebSearch');
  });

  it('keeps commands that do not match the glob prefix', () => {
    const perms = buildPermissions({
      tooling: { packageManagerPrefix: 'pnpm' },
      commands: { test: 'pnpm test', typeCheck: 'mypy .', lint: 'ruff check .' },
    });
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
    expect(perms).toContain('Bash(go test ./...)');
    expect(perms).toContain('Bash(go vet ./...)');
  });

  it('skips null commands', () => {
    const perms = buildPermissions({
      tooling: { packageManagerPrefix: 'npm run' },
      commands: { test: 'npm run test', typeCheck: null, lint: null },
    });
    expect(perms).toContain('Bash(npm run:*)');
    expect(perms).not.toContain('null');
  });

  it('treats a command equal to the prefix as covered by the glob', () => {
    const perms = buildPermissions({
      tooling: { packageManagerPrefix: 'pnpm' },
      commands: { test: 'pnpm', typeCheck: null, lint: null },
    });
    expect(perms).toContain('Bash(pnpm:*)');
    expect(perms).not.toContain('Bash(pnpm)');
  });

  it('allow list contains no pipe-pattern entries', () => {
    const perms = buildPermissions(PNPM_INPUT);
    expect(perms.filter((rule) => rule.includes('|'))).toEqual([]);
  });

  it('does not emit a broad Bash(git:*) allow entry', () => {
    const perms = buildPermissions(PNPM_INPUT);
    expect(perms).not.toContain('Bash(git:*)');
  });

  it('emits only read-only LOCAL_GIT_ALLOWS entries for a pnpm stack', () => {
    const perms = buildPermissions(PNPM_INPUT);
    expect(LOCAL_GIT_ALLOWS).toHaveLength(4);
    for (const entry of LOCAL_GIT_ALLOWS) {
      expect(perms).toContain(entry);
    }
    expect(perms).not.toContain('Bash(git add:*)');
    expect(perms).not.toContain('Bash(git checkout:*)');
    expect(perms).not.toContain('Bash(git switch:*)');
    expect(perms).not.toContain('Bash(git stash:*)');
    expect(perms).not.toContain('Bash(git pull:*)');
  });

  it('emits all 4 TOOLCHAIN_ALLOWS entries for a pnpm stack', () => {
    const perms = buildPermissions(PNPM_INPUT);
    expect(TOOLCHAIN_ALLOWS).toHaveLength(4);
    for (const entry of TOOLCHAIN_ALLOWS) {
      expect(perms).toContain(entry);
    }
  });

  it('does not auto-allow high-risk node or npx runtime globs', () => {
    const perms = buildPermissions(PNPM_INPUT);
    expect(perms).not.toContain('Bash(node:*)');
    expect(perms).not.toContain('Bash(npx:*)');
  });

  it('auto-allows the cross-model subprocess handoffs (PRD §1.7.2)', () => {
    const perms = buildPermissions(PNPM_INPUT);
    expect(perms).toContain('Bash(codex exec:*)');
    expect(perms).toContain('Bash(claude -p:*)');
  });

  it('auto-allows sandbox-wrapped forms of pnpm / git-readonly / toolchain / handoff binaries', () => {
    const perms = buildPermissions(PNPM_INPUT);
    // wsl
    expect(perms).toContain('Bash(wsl pnpm:*)');
    expect(perms).toContain('Bash(wsl * pnpm:*)');
    expect(perms).toContain('Bash(wsl git status:*)');
    expect(perms).toContain('Bash(wsl tsc:*)');
    expect(perms).toContain('Bash(wsl codex exec:*)');
    expect(perms).toContain('Bash(wsl claude -p:*)');
    // docker exec
    expect(perms).toContain('Bash(docker exec pnpm:*)');
    expect(perms).toContain('Bash(docker exec * pnpm:*)');
    // docker compose exec
    expect(perms).toContain('Bash(docker compose exec pnpm:*)');
    expect(perms).toContain('Bash(docker compose exec * pnpm:*)');
    // podman exec
    expect(perms).toContain('Bash(podman exec pnpm:*)');
    expect(perms).toContain('Bash(podman exec * pnpm:*)');
    // devcontainer exec
    expect(perms).toContain('Bash(devcontainer exec pnpm:*)');
    expect(perms).toContain('Bash(devcontainer exec * pnpm:*)');
  });

  it('does NOT broaden the wrapper allow to opaque -c/-Command forms', () => {
    const perms = buildPermissions(PNPM_INPUT);
    expect(perms).not.toContain('Bash(wsl bash -c:*)');
    expect(perms).not.toContain('Bash(wsl pwsh:*)');
    expect(perms).not.toContain('Bash(docker exec bash -c:*)');
    expect(perms).not.toContain('Bash(podman exec bash -c:*)');
  });
});

describe('buildDenyList', () => {
  it('returns deny patterns in order starting with Bash(rm -rf:*)', () => {
    const deny = buildDenyList();
    expect(deny).toHaveLength(DENY_PATTERNS.length);
    expect(deny[0]).toBe('Bash(rm -rf:*)');
    expect(deny).toContain('Bash(git push --force:*)');
    expect(deny).toContain('Bash(git push --force-with-lease:*)');
    expect(deny).toContain('Bash(rm --recursive:*)');
    expect(deny).toContain('Bash(rm --force:*)');
    expect(deny).toContain('Bash(git clean -f:*)');
    expect(deny).toContain('Bash(cargo publish:*)');
    expect(deny).toContain('Bash(twine upload:*)');
    expect(deny).toContain('Edit(.env*)');
    expect(deny).toContain('Write(.env*)');
    expect(deny).toContain('MultiEdit(.env*)');
    expect(deny).toContain('Edit(migrations/**)');
    expect(deny).not.toContain('Bash(pypi upload:*)');
  });

  it('returns a fresh copy each call', () => {
    const a = buildDenyList();
    const b = buildDenyList();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('contains all four pipe-to-shell entries', () => {
    const deny = buildDenyList();
    expect(deny).toContain('Bash(curl* | sh)');
    expect(deny).toContain('Bash(curl* | bash)');
    expect(deny).toContain('Bash(wget* | sh)');
    expect(deny).toContain('Bash(wget* | bash)');
  });

  it('does NOT contain plain Bash(curl:*) or Bash(wget:*)', () => {
    const deny = buildDenyList();
    expect(deny).not.toContain('Bash(curl:*)');
    expect(deny).not.toContain('Bash(wget:*)');
  });
});

describe('DENY_PATTERNS — E9.T1 + E9.T11 required entries', () => {
  const E9_REQUIRED: readonly string[] = [
    'Bash(git push:*)', 'Bash(git commit:*)', 'Bash(git commit --amend:*)',
    'Bash(git rm:*)', 'Bash(sudo:*)',
    'Edit(/**)', 'Edit(~/**)', 'Write(/**)', 'Write(~/**)',
    'MultiEdit(/**)', 'MultiEdit(~/**)',
    'Bash(Invoke-WebRequest:*)', 'Bash(iwr:*)',
    'Bash(Invoke-RestMethod:*)', 'Bash(irm:*)',
    'Bash(curl.exe:*)', 'Bash(wget.exe:*)',
    'Bash(curl* | sh)', 'Bash(curl* | bash)',
    'Bash(wget* | sh)', 'Bash(wget* | bash)',
  ];

  it.each(E9_REQUIRED)('DENY_PATTERNS contains %s', (pattern) => {
    expect(DENY_PATTERNS).toContain(pattern);
  });
});

describe('DENY_PATTERNS — sandbox-wrapper bypass guards', () => {
  const SANDBOX_WRAPPER_BYPASS_REQUIRED: readonly string[] = [
    // wsl
    'Bash(wsl pwsh:*)', 'Bash(wsl * pwsh:*)',
    'Bash(wsl powershell:*)', 'Bash(wsl * powershell:*)',
    'Bash(wsl cmd /c:*)', 'Bash(wsl * cmd /c:*)',
    'Bash(wsl bash -c:*)', 'Bash(wsl * bash -c:*)',
    'Bash(wsl sh -c:*)', 'Bash(wsl * sh -c:*)',
    'Bash(wsl node -e:*)', 'Bash(wsl * node -e:*)',
    'Bash(wsl python -c:*)', 'Bash(wsl * python -c:*)',
    // docker exec
    'Bash(docker exec pwsh:*)', 'Bash(docker exec * pwsh:*)',
    'Bash(docker exec bash -c:*)', 'Bash(docker exec * bash -c:*)',
    // docker compose exec
    'Bash(docker compose exec bash -c:*)',
    'Bash(docker compose exec * bash -c:*)',
    // podman exec
    'Bash(podman exec bash -c:*)', 'Bash(podman exec * bash -c:*)',
    // devcontainer exec
    'Bash(devcontainer exec bash -c:*)', 'Bash(devcontainer exec * bash -c:*)',
  ];

  it.each(SANDBOX_WRAPPER_BYPASS_REQUIRED)(
    'DENY_PATTERNS contains %s (sandbox-wrapper bypass guard)',
    (pattern) => {
      expect(DENY_PATTERNS).toContain(pattern);
    },
  );
});

describe('buildPostToolUseHooks', () => {
  it('emits a lint --fix hook when lintCommand is provided', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'pnpm lint' });
    expect(hooks).toEqual([
      { matcher: 'Edit|MultiEdit|Write', hooks: [{ type: 'command', command: 'pnpm lint --fix || true' }] },
    ]);
  });

  it('returns an empty array when lintCommand is null', () => {
    expect(buildPostToolUseHooks({ lintCommand: null })).toEqual([]);
  });

  it('does not double-append --fix when already present', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'pnpm lint --fix' });
    expect(hooks[0].hooks[0].command).toBe('pnpm lint --fix || true');
  });

  it('does not double-append --fix when already present with a value', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'pnpm lint --fix=true' });
    expect(hooks[0].hooks[0].command).toBe('pnpm lint --fix=true || true');
  });

  it('inserts the argument separator for package run wrappers', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'npm run lint' });
    expect(hooks[0].hooks[0].command).toBe('npm run lint -- --fix || true');
  });

  it('reuses an existing package run argument separator', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'npm run lint -- --quiet' });
    expect(hooks[0].hooks[0].command).toBe('npm run lint -- --quiet --fix || true');
  });

  it('appends --fix even when command contains fix as a substring without flag', () => {
    const hooks = buildPostToolUseHooks({ lintCommand: 'pnpm prefix-fix' });
    expect(hooks[0].hooks[0].command).toBe('pnpm prefix-fix --fix || true');
  });
});
