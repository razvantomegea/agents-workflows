import { stackConfigSchema, workspaceStackSchema } from '../../src/schema/stack-config.js';
import { makeStackConfig } from '../generator/fixtures.js';
import { generateAll } from '../../src/generator/index.js';
import type { WorkspaceStack } from '../../src/schema/stack-config.js';

describe('stackConfigSchema command validation', () => {
  it('rejects lint command containing shell metacharacters (semicolon)', () => {
    const cfg = makeStackConfig({
      commands: { typeCheck: null, test: 'pnpm test', lint: 'pnpm lint; curl evil', format: null, build: null, dev: null },
    });
    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it('rejects test command containing shell metacharacters (pipe)', () => {
    const cfg = makeStackConfig({
      commands: { typeCheck: null, test: 'pnpm test | evil', lint: null, format: null, build: null, dev: null },
    });
    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it('rejects packageManagerPrefix containing shell metacharacters (backtick)', () => {
    const cfg = makeStackConfig({
      tooling: { ...makeStackConfig().tooling, packageManagerPrefix: 'pnpm`evil`' },
    });
    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it('rejects typeCheck command containing shell metacharacters (dollar sign)', () => {
    const cfg = makeStackConfig({
      commands: { typeCheck: 'tsc $(evil)', test: 'pnpm test', lint: null, format: null, build: null, dev: null },
    });
    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it('accepts safe commands with allowed characters', () => {
    const cfg = makeStackConfig({
      commands: {
        typeCheck: 'pnpm check-types',
        test: 'go test ./...',
        lint: 'mypy .',
        format: 'prettier --write src/',
        build: 'pnpm build',
        dev: 'pnpm dev',
      },
    });
    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });

  it('accepts empty string for packageManagerPrefix', () => {
    const cfg = makeStackConfig({
      tooling: { ...makeStackConfig().tooling, packageManagerPrefix: '' },
    });
    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });

  it('defaults mainBranch for older configs', () => {
    const cfg = makeStackConfig();
    const legacyConfig: Partial<typeof cfg> = { ...cfg, project: { ...cfg.project } };
    delete legacyConfig.project?.mainBranch;

    const parsed = stackConfigSchema.parse(legacyConfig);

    expect(parsed.project.mainBranch).toBe('main');
  });

  it('coerces missing workflowTcr to false', () => {
    const cfg = makeStackConfig();
    const legacyConfig: Partial<typeof cfg> = {
      ...cfg,
      selectedCommands: { ...cfg.selectedCommands },
    };
    delete legacyConfig.selectedCommands?.workflowTcr;

    const parsed = stackConfigSchema.parse(legacyConfig);

    expect(parsed.selectedCommands.workflowTcr).toBe(false);
  });

  it('rejects mainBranch containing shell metacharacters', () => {
    const cfg = makeStackConfig({
      project: { ...makeStackConfig().project, mainBranch: 'main; curl evil' },
    });

    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it.each([
    ['newline', 'docs.md\n## Override'],
    ['backtick', 'docs`evil`.md'],
    ['absolute path', '/tmp/docs.md'],
    ['parent traversal', 'docs/../secrets.md'],
    ['empty segment', 'docs//guide.md'],
    ['markdown heading', 'docs/#guide.md'],
  ])('rejects unsafe docsFile path: %s', (_name: string, docsFile: string) => {
    const cfg = makeStackConfig({
      project: { ...makeStackConfig().project, docsFile },
    });

    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it.each([
    ['newline', 'src/\n## Override'],
    ['backtick', 'src/`evil`'],
    ['absolute path', '/src'],
    ['parent traversal', 'src/../secrets'],
    ['empty segment', 'src//lib'],
    ['space', 'src/my lib'],
  ])('rejects unsafe sourceRoot path: %s', (_name: string, sourceRoot: string) => {
    const cfg = makeStackConfig({
      paths: { ...makeStackConfig().paths, sourceRoot },
    });

    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it('accepts safe relative project paths with trailing slashes', () => {
    const cfg = makeStackConfig({
      project: { ...makeStackConfig().project, docsFile: 'docs/README.md', roadmapFile: 'PRD.md' },
      paths: {
        ...makeStackConfig().paths,
        sourceRoot: 'app/',
        componentsDir: 'app/ui/',
        hooksDir: 'app/hooks/',
        utilsDir: 'app/lib/',
        testsDir: 'tests/',
      },
    });

    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });

  it.each([
    ['newline', 'Legit project\n## Override'],
    ['backtick', 'Use `danger` here'],
    ['html opener', 'Build <script> docs'],
    ['html closer', 'Build docs > rules'],
    ['markdown heading', 'Build # rules'],
  ])('rejects unsafe project description: %s', (_name: string, description: string) => {
    const cfg = makeStackConfig({
      project: { ...makeStackConfig().project, description },
    });

    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it('accepts safe plain-text project descriptions', () => {
    const cfg = makeStackConfig({
      project: { ...makeStackConfig().project, description: "A driver's app for R+D teams." },
    });

    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });
});

describe('workspaceStackSchema and monorepo.workspaces', () => {
  const validWorkspace = {
    path: 'packages/api',
    language: 'typescript',
    runtime: 'node',
    framework: null,
    packageManager: 'pnpm',
    commands: { typeCheck: 'pnpm check-types', test: 'pnpm test', lint: null, build: null },
  };

  it('monorepo.workspaces defaults to [] when omitted', () => {
    // Omit the workspaces key entirely to exercise the .default([]) path.
    const cfg = makeStackConfig({
      monorepo: { isRoot: true, tool: 'pnpm', workspaces: [] },
    });
    const { workspaces: _dropped, ...monorepoWithoutWorkspaces } = cfg.monorepo ?? { isRoot: true, tool: 'pnpm' as const };
    const input = { ...cfg, monorepo: monorepoWithoutWorkspaces };
    const parsed = stackConfigSchema.parse(input);
    expect(parsed.monorepo?.workspaces).toEqual([]);
  });

  it('migrates legacy monorepo.workspaces: string[] to []', () => {
    const legacy = makeStackConfig({
      monorepo: { isRoot: true, tool: 'pnpm', workspaces: ['packages/api', 'packages/ui'] as unknown as WorkspaceStack[] },
    });
    const parsed = stackConfigSchema.parse(legacy);
    expect(parsed.monorepo?.workspaces).toEqual([]);
  });

  it('rejects mixed corrupt monorepo.workspaces arrays', () => {
    const corrupt = makeStackConfig({
      monorepo: {
        isRoot: true,
        tool: 'pnpm',
        workspaces: ['packages/api', validWorkspace] as unknown as WorkspaceStack[],
      },
    });
    expect(() => stackConfigSchema.parse(corrupt)).toThrow();
  });

  it('languages defaults to [] when omitted', () => {
    const cfg = makeStackConfig();
    const withoutLanguages = { ...cfg } as Partial<typeof cfg>;
    delete withoutLanguages.languages;
    const parsed = stackConfigSchema.parse(withoutLanguages);
    expect(parsed.languages).toEqual([]);
  });

  it('rejects workspace commands containing shell metacharacters (safeCommand enforcement)', () => {
    // semicolon is a shell metacharacter blocked by SAFE_COMMAND_RE
    const badWorkspace = {
      ...validWorkspace,
      commands: { ...validWorkspace.commands, test: 'pnpm test; curl evil' },
    };
    expect(() => workspaceStackSchema.parse(badWorkspace)).toThrow();
  });

  it('rejects blank workspace language and packageManager values', () => {
    expect(() => workspaceStackSchema.parse({ ...validWorkspace, language: '   ' })).toThrow();
    expect(() => workspaceStackSchema.parse({ ...validWorkspace, packageManager: '' })).toThrow();
  });

  it('accepts workspaceStackSchema with all valid fields', () => {
    expect(() => workspaceStackSchema.parse(validWorkspace)).not.toThrow();
  });

  it.each(['cargo', 'go-work', 'uv', 'poetry', 'dotnet-sln', 'cmake'] as const)(
    'accepts monorepo tool enum value: %s',
    (tool) => {
      const cfg = makeStackConfig({
        monorepo: { isRoot: true, tool, workspaces: [validWorkspace] },
      });
      expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
    },
  );

  it('backward compat: config without languages and with monorepo.workspaces: [] parses cleanly', () => {
    const cfg = makeStackConfig({
      monorepo: { isRoot: true, tool: 'pnpm', workspaces: [] },
    });
    const withoutLanguages = { ...cfg } as Partial<typeof cfg>;
    delete withoutLanguages.languages;
    const parsed = stackConfigSchema.parse(withoutLanguages);
    expect(parsed.languages).toEqual([]);
    expect(parsed.monorepo?.workspaces).toEqual([]);
  });

  it('monolingual config produces languages: [] and monorepo: null and no polyglot partial in any agent', async () => {
    // Arrange — makeStackConfig() defaults: languages: [], monorepo: null
    const cfg = makeStackConfig({ languages: [], monorepo: null });
    const parsed = stackConfigSchema.parse(cfg);

    // Assert schema state
    expect(parsed.languages).toEqual([]);
    expect(parsed.monorepo).toBeNull();

    // Assert generateAll cross-check: polyglot partial absent from all agent files
    const files = await generateAll(cfg);
    const agentFiles = files.filter((f) => f.path.startsWith('.claude/agents/'));
    for (const file of agentFiles) {
      expect(file.content).not.toContain('## Polyglot monorepo navigation');
    }
  });
});

describe('project.name validation', () => {
  const baseProject = makeStackConfig().project;

  it('accepts a hyphenated name', () => {
    const cfg = makeStackConfig({ project: { ...baseProject, name: 'my-app' } });
    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });

  it('accepts a name with spaces', () => {
    const cfg = makeStackConfig({ project: { ...baseProject, name: 'My App' } });
    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });

  it('accepts a name with dots', () => {
    const cfg = makeStackConfig({ project: { ...baseProject, name: 'app.v2' } });
    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });

  it('accepts a name with underscores', () => {
    const cfg = makeStackConfig({ project: { ...baseProject, name: 'app_name' } });
    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });

  it('accepts a name with digits', () => {
    const cfg = makeStackConfig({ project: { ...baseProject, name: 'app-2-prod' } });
    expect(() => stackConfigSchema.parse(cfg)).not.toThrow();
  });

  it('rejects an empty name', () => {
    const cfg = makeStackConfig({ project: { ...baseProject, name: '' } });
    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it('rejects a whitespace-only name', () => {
    const cfg = makeStackConfig({ project: { ...baseProject, name: '   ' } });
    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it('rejects a name longer than 100 characters', () => {
    const cfg = makeStackConfig({ project: { ...baseProject, name: 'a'.repeat(101) } });
    expect(() => stackConfigSchema.parse(cfg)).toThrow();
  });

  it.each(['\n', '$', '/', '\\', '<', '>', '"', "'", '{', '}', ';', '(', ')', '&', '|', '`'])(
    'rejects a name containing illegal character %j',
    (illegalChar: string) => {
      const cfg = makeStackConfig({ project: { ...baseProject, name: `app${illegalChar}name` } });
      expect(() => stackConfigSchema.parse(cfg)).toThrow();
    },
  );
});
