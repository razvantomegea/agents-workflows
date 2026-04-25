import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig } from './fixtures.js';
import { getAgentContent, getRootFileContent } from './epic-3-review-depth.helpers.js';

const partialLines = async (name: string): Promise<number> => {
  const raw = await readFile(join(process.cwd(), `src/templates/partials/${name}`), 'utf-8');
  return raw.split(/\r?\n/).length;
};

const makeFrameworkConfig = (framework: string | null): ReturnType<typeof makeStackConfig> =>
  makeStackConfig({ stack: { language: 'typescript', runtime: 'node', framework, uiLibrary: null, stateManagement: null, database: null, auth: null } });

describe('E6.T1 — supply-chain', () => {
  let govFiles: GeneratedFile[];
  let noGovFiles: GeneratedFile[];
  beforeAll(async () => { [govFiles, noGovFiles] = await Promise.all([generateAll(makeStackConfig({ governance: { enabled: true } })), generateAll(makeStackConfig({ governance: { enabled: false } }))]); });

  it('security-reviewer contains PRD §2.3 supply-chain keywords', () => {
    const c = getAgentContent(govFiles, 'security-reviewer');
    expect(c).toContain('SLSA');
    expect(c).toMatch(/CycloneDX|SBOM/);
    expect(c).toContain('cosign');
    expect(c).toContain('slopsquatting');
    expect(c).toContain('stabilityDays');
  });

  it('supply-chain partial is within 80 lines', async () => {
    expect(await partialLines('supply-chain.md.ejs')).toBeLessThanOrEqual(80);
  });

  it('governance enabled — includes SUPPLY_CHAIN.md and release.yml', () => {
    expect(govFiles.some((f) => f.path.endsWith('SUPPLY_CHAIN.md'))).toBe(true);
    expect(govFiles.some((f) => f.path.endsWith('.github/workflows/release.yml'))).toBe(true);
  });

  it('release.yml has permissions:{} and pinned checkout SHA', () => {
    const rf = govFiles.find((f) => f.path.endsWith('.github/workflows/release.yml'));
    expect(rf).toBeDefined();
    expect(rf!.content).toContain('permissions: {}');
    expect(rf!.content).toMatch(/actions\/checkout@[a-f0-9]{40}/);
  });

  it('governance disabled — SUPPLY_CHAIN.md and release.yml are absent', () => {
    expect(noGovFiles.some((f) => f.path.endsWith('SUPPLY_CHAIN.md'))).toBe(false);
    expect(noGovFiles.some((f) => f.path.endsWith('.github/workflows/release.yml'))).toBe(false);
  });
});

describe('E6.T2 — observability', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it.each([['implementer'], ['code-reviewer']])('%s contains observability keywords', (agent) => {
    const c = getAgentContent(files, agent);
    expect(c).toContain('Observability');
    expect(c).toContain('traceparent');
    expect(c).toContain('OTLP');
    expect(c).toContain('SLI');
    expect(c).toMatch(/PII|redaction/);
  });

  it('observability partial is within 40 lines', async () => {
    expect(await partialLines('observability.md.ejs')).toBeLessThanOrEqual(40);
  });
});

describe('E6.T3 — design-principles', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it.each([['architect'], ['code-reviewer']])('%s contains design-principles keywords', (agent) => {
    const c = getAgentContent(files, agent);
    expect(c).toMatch(/Ousterhout|Deep modules/);
    expect(c).toMatch(/Metz|wrong abstraction/);
    expect(c).toContain('Rule of Three');
    expect(c).toContain('CUPID');
    expect(c).toMatch(/[Cc]omposition/);
    expect(c).toContain('AHA');
  });

  it('design-principles partial is within 40 lines', async () => {
    expect(await partialLines('design-principles.md.ejs')).toBeLessThanOrEqual(40);
  });
});

describe('E6.T4 — refactoring', () => {
  it('code-optimizer contains refactoring keywords', async () => {
    const c = getAgentContent(await generateAll(makeStackConfig()), 'code-optimizer');
    expect(c).toMatch(/strangler/i);
    expect(c).toContain('branch-by-abstraction');
    expect(c).toContain('Boy Scout');
    expect(c).toMatch(/Fowler|quadrant/);
  });

  it('refactoring partial is within 40 lines', async () => {
    expect(await partialLines('refactoring.md.ejs')).toBeLessThanOrEqual(40);
  });
});

describe('E6.T5 — performance', () => {
  it('code-optimizer contains performance profiling keywords', async () => {
    const files = await generateAll(makeStackConfig());
    const c = getAgentContent(files, 'code-optimizer');
    expect(c).toContain('Profile before optimizing');
    expect(c).toMatch(/pprof|flamegraph/);
  });

  it('ui-designer contains web budget numbers for react framework', async () => {
    const c = getAgentContent(await generateAll(makeFrameworkConfig('react')), 'ui-designer');
    expect(c).toContain('170KB');
    expect(c).toContain('LCP');
    expect(c).toContain('INP');
    expect(c).toContain('CLS');
  });

  it('ui-designer omits web budget for non-frontend framework', async () => {
    expect(getAgentContent(await generateAll(makeFrameworkConfig(null)), 'ui-designer')).not.toContain('170KB');
  });

  it('code-optimizer omits web budget for non-frontend framework', async () => {
    expect(getAgentContent(await generateAll(makeFrameworkConfig(null)), 'code-optimizer')).not.toContain('170KB');
  });

  it('performance partial is within 40 lines', async () => {
    expect(await partialLines('performance.md.ejs')).toBeLessThanOrEqual(40);
  });
});

describe('E6.T6 — documentation and ADR seed', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it.each([['architect'], ['code-reviewer']])('%s contains documentation keywords', (agent) => {
    const c = getAgentContent(files, agent);
    expect(c).toContain('MADR');
    expect(c).toContain('Diátaxis');
    expect(c).toContain('C4');
  });

  it('generated files always include docs/decisions/0001-adr-template.md (unconditional)', () => {
    expect(files.some((f) => f.path.endsWith('docs/decisions/0001-adr-template.md'))).toBe(true);
  });

  it('ADR template contains MADR section headings', () => {
    const adr = files.find((f) => f.path.endsWith('docs/decisions/0001-adr-template.md'));
    expect(adr).toBeDefined();
    const c = adr!.content;
    expect(c).toContain('Context');
    expect(c).toContain('Decision Drivers');
    expect(c).toContain('Considered Options');
    expect(c).toContain('Consequences');
  });

  it('documentation partial is within 40 lines', async () => {
    expect(await partialLines('documentation.md.ejs')).toBeLessThanOrEqual(40);
  });
});

describe('E6.T7+T8 — tooling and deployment', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it('AGENTS.md contains tooling keywords and links deployment supplement', () => {
    const c = getRootFileContent(files, 'AGENTS.md');
    expect(c).toContain('Biome');
    expect(c).toContain('ESLint');
    expect(c).toContain('.editorconfig');
    expect(c).toContain('CodeQL');
    expect(c).toContain('Semgrep');
    expect(c).toContain('AGENTS-DEPLOYMENT.md');
  });

  it('AGENTS-DEPLOYMENT.md contains deployment keywords', () => {
    const c = getRootFileContent(files, 'AGENTS-DEPLOYMENT.md');
    expect(c).toContain('OpenFeature');
    expect(c).toContain('expand-contract');
    expect(c).toContain('CREATE INDEX CONCURRENTLY');
  });

  it('tooling partial is within 40 lines', async () => {
    expect(await partialLines('tooling.md.ejs')).toBeLessThanOrEqual(40);
  });

  it('deployment partial is within 40 lines', async () => {
    expect(await partialLines('deployment.md.ejs')).toBeLessThanOrEqual(40);
  });
});

describe('E6.T9 — concurrency', () => {
  it('implementer contains concurrency keywords', async () => {
    const c = getAgentContent(await generateAll(makeStackConfig()), 'implementer');
    expect(c).toMatch(/[Ss]tructured concurrency/);
    expect(c).toContain('TaskGroup');
    expect(c).toContain('bounded');
    expect(c).toContain('await');
  });

  it('concurrency partial is within 30 lines', async () => {
    expect(await partialLines('concurrency.md.ejs')).toBeLessThanOrEqual(30);
  });
});
