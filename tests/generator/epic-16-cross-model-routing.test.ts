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

    it('AGENTS.md names Claude Opus for the ui-designer role', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('**Claude Opus**');
      expect(content).toContain('MUST run before `implementer` on any UI/UX task');
    });

    it('AGENTS.md documents the UI/UX two-phase exception', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('UI/UX two-phase exception');
      expect(content).toContain('Phase A — design thinking / planning');
      expect(content).toContain('Phase B — UI implementation');
      expect(content).toContain('Claude Opus');
      expect(content).toContain('adaptive thinking on');
    });

    it('workflow-plan.md and workflow-fix.md mention Claude Opus for UI thinking', () => {
      const plan = getCommandContent(files, 'workflow-plan');
      const fix = getCommandContent(files, 'workflow-fix');
      expect(plan).toContain('Claude Opus');
      expect(plan).toContain('UI/UX design thinking');
      expect(fix).toContain('Claude Opus');
      expect(fix).toContain('UI/UX design thinking');
    });

    it('AGENTS.md documents the cross-model handoff setup with plugin install commands', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('### Cross-model handoff setup');
      expect(content).toContain('/plugin marketplace add openai/codex-plugin-cc');
      expect(content).toContain('/plugin install codex@openai-codex');
      expect(content).toContain('/codex:setup');
      expect(content).toContain('/codex:delegate');
      expect(content).toContain('/codex:review');
      expect(content).toContain('NOT driven by file watching');
    });

    it('workflow-plan.md names the Codex plugin handoff commands', () => {
      const content = getCommandContent(files, 'workflow-plan');
      expect(content).toContain('/codex:delegate');
      expect(content).toContain('/codex:review');
      expect(content).toContain('codex exec');
      expect(content).toContain('claude -p');
      expect(content).toContain('PRD §1.7.2');
      expect(content).toContain('Never use file-watch polling');
    });

    it('workflow-fix.md names the Codex plugin handoff commands', () => {
      const content = getCommandContent(files, 'workflow-fix');
      expect(content).toContain('/codex:review');
      expect(content).toContain('/codex:delegate');
      expect(content).toContain('claude -p');
      expect(content).toContain('PRD §1.7.2');
    });

    it('external-review.md names /codex:review as an allowlisted alternative', () => {
      const content = getCommandContent(files, 'external-review');
      expect(content).toContain('/codex:review');
      expect(content).toContain('Codex Plugin for Claude Code');
      expect(content).toContain('PRD §1.7.2');
      expect(content).toContain('strictly inferior to the MCP handoff');
      // CodeRabbit must remain the default; plugin supplements, not replaces.
      // EJS template hard-wraps this sentence, so match by substring on "remains the mandatory default".
      expect(content).toContain('remains the mandatory default');
      expect(content).toContain('supplements it');
    });

    it('.claude/settings.json allows the cross-model subprocess fallback commands (PRD §1.7.2)', () => {
      const settings = getRootFileContent(files, '.claude/settings.json');
      expect(settings).toContain('Bash(codex exec:*)');
      expect(settings).toContain('Bash(claude -p:*)');
    });

    it('.claude/settings.json allows scoped wsl-wrapped cross-model handoff commands', () => {
      const settings = getRootFileContent(files, '.claude/settings.json');
      expect(settings).not.toContain('Bash(wsl *)');
      expect(settings).toContain('Bash(wsl codex exec:*)');
      expect(settings).not.toContain('Bash(wsl * codex exec:*)');
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

    it('AGENTS.md renders the Claude-primary stack-aware block', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('### Stack-aware writer/reviewer defaults');
      expect(content).toContain('Claude leads on correctness');
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

  describe('Cross-stack primary/secondary map', () => {
    let files: GeneratedFile[];

    beforeAll(async () => {
      files = await generateAll(makeStackConfig());
    });

    it('AGENTS.md renders the cross-stack map header and every row', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('### Cross-stack primary / secondary map');
      expect(content).toContain('Plain JS / TS');
      expect(content).toContain('React / Next.js / React Native / Remix');
      expect(content).toContain('Three.js / WebGL');
      expect(content).toContain('Vue / Svelte / Solid / Angular');
      expect(content).toContain('Python (FastAPI / Django / Flask / data)');
      expect(content).toContain('C++ / systems / low-level');
      expect(content).toContain('Java (Spring, enterprise OO)');
      expect(content).toContain('C# / .NET');
      expect(content).toContain('Go (services, CLIs, concurrency)');
      expect(content).toContain('Rust (ownership, lifetimes, refactors)');
      expect(content).toContain('PHP (Laravel, Symfony)');
      expect(content).toContain('Ruby / Rails');
      expect(content).toContain('Swift / iOS (SwiftUI, UIKit)');
      expect(content).toContain('Kotlin / Android');
    });

    it('AGENTS.md flags C++ as compiler-arbitrated (no authoritative family)', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('neither family is authoritative');
      expect(content).toContain('compiler, sanitizers, and tests');
    });
  });

  describe('Rust workspace (Claude primary)', () => {
    let files: GeneratedFile[];

    beforeAll(async () => {
      files = await generateAll(
        makeStackConfig({
          stack: {
            language: 'rust',
            runtime: 'rust',
            framework: 'axum',
            uiLibrary: null,
            stateManagement: null,
            database: 'postgres',
            auth: null,
            i18nLibrary: null,
          },
        }),
      );
    });

    it('AGENTS.md routes Rust workspaces to Claude as implementer', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('Claude leads on correctness');
      expect(content).toContain('Implementer: **Claude**');
      expect(content).not.toContain('GPT-5.x leads on rapid implementation');
    });
  });

  describe('Go workspace (GPT-5.x primary)', () => {
    let files: GeneratedFile[];

    beforeAll(async () => {
      files = await generateAll(
        makeStackConfig({
          stack: {
            language: 'go',
            runtime: 'go',
            framework: 'gin',
            uiLibrary: null,
            stateManagement: null,
            database: 'postgres',
            auth: null,
            i18nLibrary: null,
          },
        }),
      );
    });

    it('AGENTS.md routes Go workspaces to GPT-5.x as implementer', () => {
      const content = getRootFileContent(files, 'AGENTS.md');
      expect(content).toContain('GPT-5.x leads on rapid implementation');
      expect(content).toContain('Implementer: **GPT-5.x**');
      expect(content).not.toContain('Claude leads on correctness');
    });
  });
});
