import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import {
  makeStackConfig,
  findFile,
  getContent,
  IMPLEMENTER_PATH,
  UI_DESIGNER_PATH,
  ARCHITECT_PATH,
  I18N_HEADING,
  TCR_CLAUDE_PATH,
  TCR_CODEX_PATH,
  COMPLIANCE_PATH,
  OSCAL_PATH,
} from './fixtures.js';

describe('Epic 8 integration — all flags ON', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(
      makeStackConfig({
        stack: { i18nLibrary: 'i18next' },
        selectedCommands: { workflowTcr: true },
        governance: { enabled: true },
        targets: { claudeCode: true, codexCli: true },
      }),
    );
  });

  it('T2: implementer.md contains Internationalization section', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain(I18N_HEADING);
  });

  it('T2: ui-designer.md contains Internationalization section', () => {
    expect(getContent(files, UI_DESIGNER_PATH)).toContain(I18N_HEADING);
  });

  it('T3: .claude/commands/workflow-tcr.md is emitted', () => {
    expect(findFile(files, TCR_CLAUDE_PATH)).toBeDefined();
  });

  it('T3: .codex/prompts/workflow-tcr.md is emitted', () => {
    expect(findFile(files, TCR_CODEX_PATH)).toBeDefined();
  });

  it('T4: docs/COMPLIANCE.md is emitted', () => {
    expect(findFile(files, COMPLIANCE_PATH)).toBeDefined();
  });

  it('T4: docs/oscal/component-definition.json is emitted', () => {
    expect(findFile(files, OSCAL_PATH)).toBeDefined();
  });

  it('T5: implementer.md contains eBPF reference', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('eBPF');
  });

  it('T6: architect.md contains stacked PR tooling reference', () => {
    const content = getContent(files, ARCHITECT_PATH);
    const hasRef = content.includes('gt create') || content.includes('Stacked PR') || content.includes('stacked PR');
    expect(hasRef).toBe(true);
  });
});

describe('Epic 8 integration — all flags OFF (defaults)', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('T2: implementer.md has no Internationalization section', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).not.toContain(I18N_HEADING);
  });

  it('T2: ui-designer.md has no Internationalization section', () => {
    expect(getContent(files, UI_DESIGNER_PATH)).not.toContain(I18N_HEADING);
  });

  it('T3: .claude/commands/workflow-tcr.md is not emitted', () => {
    expect(findFile(files, TCR_CLAUDE_PATH)).toBeUndefined();
  });

  it('T3: .codex/prompts/workflow-tcr.md is not emitted', () => {
    expect(findFile(files, TCR_CODEX_PATH)).toBeUndefined();
  });

  it('T4: docs/COMPLIANCE.md is not emitted', () => {
    expect(findFile(files, COMPLIANCE_PATH)).toBeUndefined();
  });

  it('T4: docs/oscal/component-definition.json is not emitted', () => {
    expect(findFile(files, OSCAL_PATH)).toBeUndefined();
  });
});

describe('Epic 8 integration — regression: pre-Epic-8 paths still present', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('AGENTS.md is still emitted', () => {
    expect(findFile(files, 'AGENTS.md')).toBeDefined();
  });

  it('CLAUDE.md is still emitted', () => {
    expect(findFile(files, 'CLAUDE.md')).toBeDefined();
  });
});
