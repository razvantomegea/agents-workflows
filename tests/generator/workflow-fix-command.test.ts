import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';

describe('workflow-fix command generation', () => {
  it('omits an empty type-check reference when no type-check command is configured', async () => {
    const files = await generateAll(
      makeStackConfig({
        commands: {
          typeCheck: null,
          test: 'pnpm test',
          lint: 'pnpm lint',
          format: null,
          build: null,
          dev: null,
        },
      }),
    );
    const workflowFix = files.find(
      (generatedFile: GeneratedFile) => generatedFile.path === '.claude/commands/workflow-fix.md',
    );

    expect(workflowFix).toBeDefined();
    expect(workflowFix?.content).toContain('If `pnpm test` fails on files **unrelated**');
    expect(workflowFix?.content).not.toContain('If `` or `pnpm test` fails');
    expect(workflowFix?.content).not.toContain('`null`');
  });

  it('uses a code-reviewer-only loop when security-reviewer is disabled', async () => {
    const files = await generateAll(
      makeStackConfig({
        agents: {
          ...makeStackConfig().agents,
          securityReviewer: false,
        },
      }),
    );
    const workflowFix = files.find(
      (generatedFile: GeneratedFile) => generatedFile.path === '.claude/commands/workflow-fix.md',
    );

    expect(workflowFix).toBeDefined();
    expect(workflowFix?.content).toContain('Run `code-reviewer` on all modified files');
    expect(workflowFix?.content).not.toContain('security-reviewer');
    expect(workflowFix?.content).not.toContain('from both reviewers');
  });
});
