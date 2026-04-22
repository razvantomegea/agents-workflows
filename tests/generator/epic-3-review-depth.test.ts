import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { CODE_REVIEWER_MAX_LINES, makeStackConfig } from './fixtures.js';
import {
  AI_COMPLACENCY_CONSUMERS,
  MODEL_ROUTING_ROLES,
  SECTION_HEADINGS,
  assertStepOrder,
  getAgentContent,
  getCommandContent,
  getRootFileContent,
} from './epic-3-review-depth.helpers.js';

describe('Epic 3 review depth', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('renders all nine Section 2.1 section headings in code-reviewer', () => {
    const content = getAgentContent(files, 'code-reviewer');
    for (const heading of SECTION_HEADINGS) {
      expect(content).toContain(heading);
    }
  });

  it(`code-reviewer rendered output stays <= ${CODE_REVIEWER_MAX_LINES} lines`, () => {
    const content = getAgentContent(files, 'code-reviewer');
    expect(content.split(/\r?\n/).length).toBeLessThanOrEqual(CODE_REVIEWER_MAX_LINES);
  });

  it('review-checklist includes Conventional Comments footer', () => {
    const content = getAgentContent(files, 'code-reviewer');
    expect(content).toContain('Use Conventional Comments');
    expect(content).toContain('(blocking)');
  });

  it('ai-complacency partial renders in code-reviewer, reviewer, and external-review only', () => {
    const externalReview = getCommandContent(files, 'external-review');
    expect(externalReview).toContain('<ai_complacency_guard>');

    for (const agentName of AI_COMPLACENCY_CONSUMERS) {
      expect(getAgentContent(files, agentName)).toContain('<ai_complacency_guard>');
    }

    const excludedAgents = [
      'architect',
      'implementer',
      'test-writer',
      'code-optimizer',
      'security-reviewer',
      'e2e-tester',
      'ui-designer',
      'react-ts-senior',
    ];
    for (const agentName of excludedAgents) {
      const agentFile = files.find(
        (generatedFile: GeneratedFile) => generatedFile.path === `.claude/agents/${agentName}.md`,
      );
      if (agentFile) {
        expect(agentFile.content).not.toContain('<ai_complacency_guard>');
      }
    }
  });

  it('ai-complacency enforces no-auto-merge clause in all three consumers', () => {
    const noAutoMerge = 'Never auto-merge on AI approval alone';
    expect(getAgentContent(files, 'code-reviewer')).toContain(noAutoMerge);
    expect(getAgentContent(files, 'reviewer')).toContain(noAutoMerge);
    expect(getCommandContent(files, 'external-review')).toContain(noAutoMerge);
  });

  it('AGENTS.md contains model-routing table with nine roles', () => {
    const content = getRootFileContent(files, 'AGENTS.md');
    expect(content).toContain('## Model routing');
    for (const role of MODEL_ROUTING_ROLES) {
      expect(content).toContain(role);
    }
    expect(content).toContain('never let the writer be its own final reviewer');
  });

  it('reviewer gate has five numbered steps in order (including lint/format)', () => {
    const content = getAgentContent(files, 'reviewer');
    assertStepOrder(content, [
      '1. Invoke `code-reviewer`',
      '2. Apply every critical and warning finding via `implementer`',
      '3. Run type-check: `pnpm check-types`',
      '4. Run tests: `pnpm test`',
      '5. Run lint/format: `pnpm lint`',
    ]);
    expect(content).toContain('**If invocation fails:**');
    expect(content).toContain('**If fixes introduce new findings:**');
    expect(content).toContain('**If type-check fails:**');
    expect(content).toContain('**If any suite fails:**');
    expect(content).toContain('**If lint/format fails:**');
  });
});
