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
