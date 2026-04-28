import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig } from './fixtures.js';

const ALL_AGENTS = [
  'architect',
  'implementer',
  'code-reviewer',
  'security-reviewer',
  'code-optimizer',
  'test-writer',
  'e2e-tester',
  'reviewer',
  'ui-designer',
];

const AGENTS_WITH_DOD = ['implementer', 'code-optimizer', 'reviewer'];
const AGENTS_WITH_ERROR_HANDLING = ['implementer', 'code-optimizer'];
const AGENTS_WITH_TDD = ['implementer', 'test-writer'];

const getAgentContent = (files: GeneratedFile[], agentName: string): string => {
  const agentFile = files.find(
    (file: GeneratedFile) => file.path === `.claude/agents/${agentName}.md`,
  );
  if (!agentFile) {
    throw new Error(`Agent file not found: ${agentName}`);
  }
  return agentFile.content;
};

const getCommandContent = (files: GeneratedFile[], commandName: string): string => {
  const commandFile = files.find(
    (file: GeneratedFile) => file.path === `.claude/commands/${commandName}.md`,
  );
  if (!commandFile) {
    throw new Error(`Command file not found: ${commandName}`);
  }
  return commandFile.content;
};

interface AssertInclusionArgs {
  files: GeneratedFile[];
  included: string[];
  anchor: string;
}

const assertInclusion = ({ files, included, anchor }: AssertInclusionArgs): void => {
  for (const agentName of included) {
    expect(getAgentContent(files, agentName)).toContain(anchor);
  }
  const excluded = ALL_AGENTS.filter((name: string) => !included.includes(name));
  for (const agentName of excluded) {
    expect(getAgentContent(files, agentName)).not.toContain(anchor);
  }
};

const assertStepOrder = (content: string, orderedSteps: string[]): void => {
  let previousIndex = -1;

  for (const step of orderedSteps) {
    const stepIndex = content.indexOf(step);
    if (stepIndex <= -1) {
      throw new Error(`Expected step to exist in content: "${step}"`);
    }
    if (stepIndex <= previousIndex) {
      throw new Error(`Expected step "${step}" to appear after the previous ordered step`);
    }
    previousIndex = stepIndex;
  }
};

const extractTaggedBlock = (content: string, tag: string): string => {
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  const start = content.indexOf(openTag);
  const end = content.indexOf(closeTag);
  if (start < 0 || end < 0) {
    throw new Error(`Tag <${tag}> not found in content`);
  }
  if (end < start) {
    throw new Error(`Closing tag ${closeTag} found before opening tag ${openTag}`);
  }
  return content.slice(start, end + closeTag.length);
};

describe('Epic 2 quality partials', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('wires definition-of-done into implementer, code-optimizer, reviewer only', () => {
    assertInclusion({ files, included: AGENTS_WITH_DOD, anchor: '<definition_of_done>' });
    expect(getAgentContent(files, 'implementer')).toContain('Never suppress or catch-and-ignore');
    expect(getAgentContent(files, 'implementer')).toContain(
      'Never delete or weaken an existing test',
    );
  });

  it('wires error-handling-self into implementer and code-optimizer only', () => {
    assertInclusion({ files, included: AGENTS_WITH_ERROR_HANDLING, anchor: '<error_handling_self>' });
    expect(getAgentContent(files, 'implementer')).toContain('two honest attempts');
  });

  it('wires tdd-discipline into implementer and test-writer only', () => {
    assertInclusion({ files, included: AGENTS_WITH_TDD, anchor: '<tdd_discipline>' });
    expect(getAgentContent(files, 'implementer')).toContain(
      'Read `README.md` before planning, implementing, reviewing, or writing tests',
    );
    expect(getAgentContent(files, 'implementer')).toContain(
      'roadmap files as secondary planning context',
    );
    expect(getAgentContent(files, 'test-writer')).toContain(
      'NEVER delete or weaken an existing test',
    );
  });

  it('implementer orders failing tests before implementation work', () => {
    const implementer = getAgentContent(files, 'implementer');
    assertStepOrder(implementer, [
      'Add or update focused tests for new logic and changed behavior',
      'Implement the smallest coherent change that satisfies the task',
      'Run the relevant tests and checks',
    ]);
  });

  it('architect emits planning_protocol with 4 phases and required fields', () => {
    const architect = getAgentContent(files, 'architect');
    expect(architect).toContain('<planning_protocol>');
    expect(architect).toContain('EXPLORE');
    expect(architect).toContain('read `PRD.md`');
    expect(architect).toContain('verify proposed components');
    expect(architect).toContain('CLARIFY');
    expect(architect).toContain('PLAN');
    expect(architect).toContain('HANDOFF');
    expect(architect).toContain('Verification strategy per task');
    expect(architect).toContain('Out-of-scope items');
    expect(architect).not.toContain('Draft no more than 8 dependency-ordered');
  });

  it('architect has the tools required to inspect state and write PLAN.md', () => {
    const architect = getAgentContent(files, 'architect');
    expect(architect).toMatch(/^tools: Read, Edit, Write, Bash, Grep, Glob, Agent$/m);
    expect(architect).toContain('write the complete plan to `./PLAN.md`');
  });

  it('fail-safe allows task-related dirty state during implementation and review passes', () => {
    const implementer = getAgentContent(files, 'implementer');
    expect(implementer).toContain('Task-related edits are allowed');
    expect(implementer).toContain('unrelated local edits outside this task');
    expect(implementer).not.toContain('If the tree is dirty, on an unexpected branch');
  });

  it('workflow commands update only confirmed PRD task items', async () => {
    const config = makeStackConfig();
    config.project.docsFile = 'PRD.md';
    config.project.roadmapFile = 'PRD.md';
    const commandFiles = await generateAll(config);
    const workflowPlan = getCommandContent(commandFiles, 'workflow-plan');
    const workflowFix = getCommandContent(commandFiles, 'workflow-fix');

    expect(workflowPlan).toContain('Mark only `PRD.md` checklist items or task headings');
    expect(workflowPlan).toContain('only when every task item under that epic is confirmed complete');
    expect(workflowFix).toContain('mark only the matching `PRD.md` checklist items or task headings');
    expect(workflowFix).toContain('Leave incomplete or unmatched `PRD.md` items unchanged');
    expect(workflowPlan).not.toContain('Append `— [DONE]` to every sub-task heading');
    expect(workflowFix).not.toContain('append `— [DONE]` to each sub-task heading');
  });

  it('tdd-discipline block renders byte-identical in implementer and test-writer', () => {
    const implementerBlock = extractTaggedBlock(
      getAgentContent(files, 'implementer'),
      'tdd_discipline',
    );
    const testWriterBlock = extractTaggedBlock(
      getAgentContent(files, 'test-writer'),
      'tdd_discipline',
    );
    expect(implementerBlock).toBe(testWriterBlock);
  });

  it('extractTaggedBlock rejects malformed tag ordering', () => {
    expect(() => extractTaggedBlock('</broken><broken>', 'broken')).toThrow(
      'Closing tag </broken> found before opening tag <broken>',
    );
  });
});
