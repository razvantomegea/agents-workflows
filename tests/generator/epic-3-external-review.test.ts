import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig } from './fixtures.js';
import { assertStepOrder, getCommandContent } from './epic-3-review-depth.helpers.js';

describe('Epic 3 external review depth', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('external-review enforces different-family rule', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('different model family');
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
    expect(content).toContain('curl -fsSLo /tmp/coderabbit-install.sh');
    expect(content).toContain('sha256sum /tmp/coderabbit-install.sh');
  });

  it('external-review documents WSL PATH pitfall', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('~/.local/bin/cr');
    expect(content).toContain('wslpath -a');
  });

  it('external-review QA.md format uses grouped-by-file structure', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('## CodeRabbit Review -');
    expect(content).toContain('[critical]');
    expect(content).toContain('[warning]');
    expect(content).toContain('[suggestion]');
    expect(content).toContain('All good!');
    expect(content).toContain('These findings come from an automated tool');
  });

  it('external-review preserves allowlist escape hatch', () => {
    const content = getCommandContent(files, 'external-review');
    expect(content).toContain('coderabbit review');
    expect(content).toContain('curl --head');
    expect(content).toContain('gh pr view');
    expect(content).toContain('Advanced: terminal-command override');
    expect(content).toContain('entire token list');
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
