import { stackConfigSchema } from '../../src/schema/stack-config.js';
import { makeStackConfig } from '../generator/fixtures.js';

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

  it('rejects mainBranch containing shell metacharacters', () => {
    const cfg = makeStackConfig({
      project: { ...makeStackConfig().project, mainBranch: 'main; curl evil' },
    });

    expect(() => stackConfigSchema.parse(cfg)).toThrow();
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
