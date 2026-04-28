import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig } from './fixtures.js';
import { getAgentContent } from './epic-3-review-depth.helpers.js';

const partialLines = async (name: string): Promise<number> => {
  const content = await readFile(join(process.cwd(), `src/templates/partials/${name}`), 'utf-8');
  return content.split(/\r?\n/).length;
};

const makeFrameworkConfig = (framework: string | null): ReturnType<typeof makeStackConfig> =>
  makeStackConfig({
    stack: { language: 'typescript', runtime: 'node', framework, uiLibrary: null, stateManagement: null, database: null, auth: null },
    agents: { implementerVariant: 'generic' },
  });

describe('Epic 4 T1 — security-defaults', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it.each([['implementer'], ['security-reviewer']])(
    '%s contains security_defaults tag and required literals',
    (agent) => {
      const c = getAgentContent(files, agent);
      expect(c).toContain('<security_defaults>');
      expect(c).toContain('Argon2id');
      expect(c).toContain('OAuth 2.0 Security Best Current Practice (RFC 9700)');
      expect(c).toContain('CSP');
      expect(c).toContain('__Host-');
      expect(c).toContain('RFC 9457');
      expect(c).toContain('LLM07');
    },
  );

  it('security-defaults partial is within 120 lines', async () => {
    expect(await partialLines('security-defaults.md.ejs')).toBeLessThanOrEqual(120);
  });
});

describe('Epic 4 T2 — git-rules', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it('architect contains all 11 Conventional Commits types', () => {
    const c = getAgentContent(files, 'architect');
    for (const t of ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']) {
      expect(c).toMatch(new RegExp(`\\b${t}\\b`));
    }
  });

  it('architect contains git-rules required literals', () => {
    const c = getAgentContent(files, 'architect');
    for (const s of ['400', 'Sigstore', 'gitsign', 'Trunk', 'BREAKING CHANGE']) {
      expect(c).toContain(s);
    }
  });

  it('git-rules partial is within 80 lines', async () => {
    expect(await partialLines('git-rules.md.ejs')).toBeLessThanOrEqual(80);
  });
});

describe('Epic 4 T3 — error-handling-code', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it.each([['implementer'], ['code-reviewer']])(
    '%s contains error_handling_code tag and required literals',
    (agent) => {
      const c = getAgentContent(files, agent);
      expect(c).toContain('<error_handling_code>');
      expect(c).toContain('{ cause: original }');
      expect(c).toContain("Parse, don't validate");
      expect(c).toContain('reason:');
    },
  );

  it('error-handling-code partial is within 50 lines', async () => {
    expect(await partialLines('error-handling-code.md.ejs')).toBeLessThanOrEqual(50);
  });
});

describe('Epic 4 T4 — testing-patterns and e2e smoke', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it('test-writer contains testing tier keywords', () => {
    const c = getAgentContent(files, 'test-writer');
    for (const s of ['70', '85', 'Mutation', 'Property-based', 'Pact', 'Trophy', 'pyramid']) {
      expect(c).toContain(s);
    }
  });

  it('e2e-tester contains accessibility smoke keywords', () => {
    const c = getAgentContent(files, 'e2e-tester');
    for (const s of ['keyboard', '400%', 'NVDA', 'VoiceOver', 'prefers-reduced-motion']) {
      expect(c).toContain(s);
    }
  });
});

describe('Implementation agent description omits "none" framework placeholder', () => {
  it.each([[null], ['none'], ['None'], ['NONE']])(
    'implementer description does not leak framework=%s into the header line',
    async (fw: string | null) => {
      const files = await generateAll(makeFrameworkConfig(fw));
      const c = getAgentContent(files, 'implementer');
      expect(c).not.toMatch(/senior (none|None|NONE)\b/);
      expect(c).toMatch(/senior typescript implementation agent/);
    },
  );
});

describe('Epic 4 T5 — api-design conditional', () => {
  const BACKEND = ['express', 'fastify', 'hono', 'nestjs', 'fastapi', 'django', 'flask'] as const;
  const NON_BACKEND = ['nextjs', 'react', 'vue', null] as const;

  it.each(BACKEND.map((fw) => [fw]))(
    'implementer includes api_design for backend framework: %s',
    async (fw) => {
      const files = await generateAll(makeFrameworkConfig(fw));
      const c = getAgentContent(files, 'implementer');
      expect(c).toContain('<api_design>');
      expect(c).toContain('OpenAPI 3.1');
      expect(c).toContain('RFC 9457');
      expect(c).toContain('Idempotency-Key');
      expect(c).toContain('RateLimit');
      expect(c).toContain('persisted queries');
    },
  );

  it.each(NON_BACKEND.map((fw) => [fw]))(
    'implementer excludes api_design for non-backend framework: %s',
    async (fw) => {
      const files = await generateAll(makeFrameworkConfig(fw));
      expect(getAgentContent(files, 'implementer')).not.toContain('<api_design>');
    },
  );
});

describe('Epic 4 T6 — accessibility', () => {
  let files: GeneratedFile[];
  beforeAll(async () => { files = await generateAll(makeStackConfig()); });

  it.each([['ui-designer'], ['e2e-tester']])(
    '%s contains accessibility tag and required literals',
    (agent) => {
      const c = getAgentContent(files, agent);
      expect(c).toContain('<accessibility>');
      expect(c).toContain('WCAG 2.2');
      expect(c).toMatch(/24[×x]24/);
      expect(c).toContain('SC 2.5.8');
      expect(c).toContain('prefers-reduced-motion');
      expect(c).toContain('axe-core');
      expect(c).toMatch(/EAA|European Accessibility Act/);
    },
  );
});
