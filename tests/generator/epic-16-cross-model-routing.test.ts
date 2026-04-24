import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig } from './fixtures.js';
import { getCommandContent, getRootFileContent } from './epic-3-review-depth.helpers.js';

const MODEL_SELECTION_HEADING = 'Model selection when both Claude and GPT are available';
const WRITER_REVIEWER_RULE = 'never let the writer be its own final reviewer';

describe('Epic 16 — Claude + GPT cross-model routing', () => {
  describe('TypeScript / React workspace', () => {
    let files: GeneratedFile[];

    beforeAll(async () => {
      files = await generateAll(makeStackConfig());
    });

    it('AGENTS.md routing table names Claude and GPT-5.x', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('## Model routing (Claude + GPT defaults');
      expect(content).toContain('Claude');
      expect(content).toContain('GPT-5.x');
      expect(content).toContain(WRITER_REVIEWER_RULE);
    });

    it('AGENTS.md drops the abstract "Opus-class / Sonnet-class" naming', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).not.toContain('Opus-class (thinking on)');
      expect(content).not.toContain('Sonnet-class / Codex-class');
    });

    it('AGENTS.md renders the TS/React stack-aware block', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('### Stack-aware writer/reviewer defaults');
      expect(content).toContain('TypeScript / React front-end');
      expect(content).toContain('Implementer: **GPT-5.x**');
      expect(content).toContain('Reviewer + `/external-review`: **Claude**');
    });

    it('workflow-plan.md contains the model-selection block', () => {
      const content = getCommandContent(files, 'workflow-plan');
      expect(content).toContain(MODEL_SELECTION_HEADING);
      expect(content).toContain('Claude');
      expect(content).toContain('GPT-5.x');
      expect(content).toContain('Writer and reviewer MUST be different families');
    });

    it('workflow-fix.md contains the model-selection block', () => {
      const content = getCommandContent(files, 'workflow-fix');
      expect(content).toContain(MODEL_SELECTION_HEADING);
      expect(content).toContain('TypeScript / React / React Native / Three.js');
      expect(content).toContain('Python / infra / correctness-sensitive');
    });

    it('external-review.md contains the opposite-family reminder', () => {
      const content = getCommandContent(files, 'external-review');
      expect(content).toContain('Claude ↔ GPT-5.x');
      expect(content).toContain('opposite model family');
      expect(content).toContain('PRD §1.7.1');
    });
  });

  describe('Python backend workspace', () => {
    let files: GeneratedFile[];

    beforeAll(async () => {
      files = await generateAll(
        makeStackConfig({
          stack: {
            language: 'python',
            runtime: 'python',
            framework: 'fastapi',
            uiLibrary: null,
            stateManagement: null,
            database: 'postgres',
            auth: null,
            i18nLibrary: null,
          },
        }),
      );
    });

    it('AGENTS.md renders the Python/backend stack-aware block', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('### Stack-aware writer/reviewer defaults');
      expect(content).toContain('non-TypeScript backend');
      expect(content).toContain('Implementer: **Claude**');
      expect(content).toContain('Reviewer + `/external-review`: **GPT-5.x**');
      expect(content).not.toContain('TypeScript / React front-end');
    });

    it('AGENTS.md still names Claude and GPT-5.x in the routing table', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('Claude');
      expect(content).toContain('GPT-5.x');
      expect(content).toContain(WRITER_REVIEWER_RULE);
    });
  });
});
