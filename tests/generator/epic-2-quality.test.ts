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
  'react-ts-senior',
];

const AGENTS_WITH_DOD = ['implementer', 'code-optimizer', 'reviewer'];
const AGENTS_WITH_ERROR_HANDLING = ['implementer', 'code-optimizer'];
const AGENTS_WITH_TDD = ['implementer', 'test-writer'];

const getAgentContent = (files: GeneratedFile[], agentName: string): string => {
  const agentFile = files.find((file) => file.path === `.claude/agents/${agentName}.md`);
  if (!agentFile) {
    throw new Error(`Agent file not found: ${agentName}`);
  }
  return agentFile.content;
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
  const excluded = ALL_AGENTS.filter((name) => !included.includes(name));
  for (const agentName of excluded) {
    expect(getAgentContent(files, agentName)).not.toContain(anchor);
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
    expect(getAgentContent(files, 'test-writer')).toContain(
      'NEVER delete or weaken an existing test',
    );
  });

  it('architect emits planning_protocol with 4 phases and required fields', () => {
    const architect = getAgentContent(files, 'architect');
    expect(architect).toContain('<planning_protocol>');
    expect(architect).toContain('EXPLORE');
    expect(architect).toContain('CLARIFY');
    expect(architect).toContain('PLAN');
    expect(architect).toContain('HANDOFF');
    expect(architect).toContain('Verification strategy per task');
    expect(architect).toContain('Out-of-scope items');
    expect(architect).not.toContain('Draft no more than 8 dependency-ordered');
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
