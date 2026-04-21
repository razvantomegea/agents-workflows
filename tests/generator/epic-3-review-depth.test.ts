import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig } from './fixtures.js';

const SECTION_HEADINGS = [
  '### 1. Correctness',
  '### 2. Security (OWASP Top 10 2025 baseline)',
  '### 3. Tests',
  '### 4. Design',
  '### 5. Readability / naming',
  '### 6. Observability',
  '### 7. Documentation',
  '### 8. Git hygiene',
  '### 9. AI-specific',
];

const AI_COMPLACENCY_CONSUMERS = ['code-reviewer', 'reviewer'];

const MODEL_ROUTING_ROLES = [
  'architect',
  'implementer',
  'code-reviewer',
  'reviewer',
  'external-review',
  'code-optimizer',
  'test-writer',
  'e2e-tester',
  'ui-designer',
];

interface GetFileContentParams {
  files: GeneratedFile[];
  filePath: string;
  label: string;
}

const getFileContent = ({ files, filePath, label }: GetFileContentParams): string => {
  const file = files.find((f: GeneratedFile) => f.path === filePath);
  if (!file) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  return file.content;
};

const getAgentContent = (files: GeneratedFile[], agentName: string): string =>
  getFileContent({ files, filePath: `.claude/agents/${agentName}.md`, label: 'Agent file' });

const getCommandContent = (files: GeneratedFile[], commandName: string): string =>
  getFileContent({ files, filePath: `.claude/commands/${commandName}.md`, label: 'Command file' });

const getRootFileContent = (files: GeneratedFile[], fileName: string): string =>
  getFileContent({ files, filePath: fileName, label: 'Root file' });

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

describe('Epic 3 review depth', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('renders all nine §2.1 section headings in code-reviewer', () => {
    const content = getAgentContent(files, 'code-reviewer');
    for (const heading of SECTION_HEADINGS) {
      expect(content).toContain(heading);
    }
  });

  it('code-reviewer rendered output stays ≤ 250 lines', () => {
    const content = getAgentContent(files, 'code-reviewer');
    expect(content.split(/\r?\n/).length).toBeLessThanOrEqual(250);
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
        (file: GeneratedFile) => file.path === `.claude/agents/${agentName}.md`,
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

  it('external-review enforces different-family rule', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('different model family');
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

  it('external-review declares CodeRabbit CLI as mandatory default', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('mandatory default');
    expect(content).toContain('CodeRabbit CLI');
    expect(content).toContain('Code Rabbit CLI');
  });

  it('external-review documents all three platform invocations', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('wsl -d Ubuntu');
    expect(content).toContain('/mnt/c/');
    expect(content).toContain('cr review --agent --base main');
    expect(content).toContain('brew install coderabbit');
    expect(content).toContain('curl -fsSL https://cli.coderabbit.ai/install.sh');
  });

  it('external-review documents WSL PATH pitfall', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('~/.local/bin/cr');
    expect(content).toContain('wslpath -a');
  });

  it('external-review QA.md format uses grouped-by-file structure', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('## CodeRabbit Review —');
    expect(content).toContain('[critical]');
    expect(content).toContain('[warning]');
    expect(content).toContain('[suggestion]');
    expect(content).toContain('All good!');
  });

  it('external-review preserves allowlist escape hatch', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('coderabbit review');
    expect(content).toContain('curl --head');
    expect(content).toContain('gh pr view');
    expect(content).toContain('Advanced: terminal-command override');
  });

  it('workflow-plan runs external-review as mandatory final gate', () => {
    const workflowPlan = getCommandContent(files, 'workflow-plan');
    expect(workflowPlan).toContain('/external-review');
    expect(workflowPlan).toContain('Mandatory external review');
    assertStepOrder(workflowPlan, [
      'Final review loop',
      'Mandatory external review',
      'Record final summary inputs',
    ]);
  });
});
