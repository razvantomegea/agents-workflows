import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig, findFile, getContent } from './fixtures.js';

const PR_TEMPLATE_PATH = '.github/pull_request_template.md';
const GOVERNANCE_PATH = 'docs/GOVERNANCE.md';

describe('Epic 5 T5 — governance opt-out (default)', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('does not emit pull_request_template.md when governance.enabled is false', () => {
    expect(findFile(files, PR_TEMPLATE_PATH)).toBeUndefined();
  });

  it('does not emit GOVERNANCE.md when governance.enabled is false', () => {
    expect(findFile(files, GOVERNANCE_PATH)).toBeUndefined();
  });
});

describe('Epic 5 T5 — governance opt-in', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig({ governance: { enabled: true } }));
  });

  it('emits pull_request_template.md when governance.enabled is true', () => {
    expect(findFile(files, PR_TEMPLATE_PATH)).toBeDefined();
  });

  it('emits GOVERNANCE.md when governance.enabled is true', () => {
    expect(findFile(files, GOVERNANCE_PATH)).toBeDefined();
  });

  it('PR template contains "## What" heading', () => {
    expect(getContent(files, PR_TEMPLATE_PATH)).toContain('## What');
  });

  it('PR template contains "## Why" heading', () => {
    expect(getContent(files, PR_TEMPLATE_PATH)).toContain('## Why');
  });

  it('PR template contains "## How tested" heading', () => {
    expect(getContent(files, PR_TEMPLATE_PATH)).toContain('## How tested');
  });

  it('PR template contains "## Agent involvement" heading', () => {
    expect(getContent(files, PR_TEMPLATE_PATH)).toContain('## Agent involvement');
  });

  it('PR template contains "Agent-authored (writer model:" literal', () => {
    expect(getContent(files, PR_TEMPLATE_PATH)).toContain('Agent-authored (writer model:');
  });

  it('GOVERNANCE.md contains "agent-authored" label literal', () => {
    expect(getContent(files, GOVERNANCE_PATH)).toContain('agent-authored');
  });

  it('GOVERNANCE.md contains "needs-human-review" label literal', () => {
    expect(getContent(files, GOVERNANCE_PATH)).toContain('needs-human-review');
  });

  it('GOVERNANCE.md contains "stream-json" audit flag literal', () => {
    expect(getContent(files, GOVERNANCE_PATH)).toContain('stream-json');
  });
});
