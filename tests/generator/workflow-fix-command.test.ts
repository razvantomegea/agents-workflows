import { generateAll } from '../../src/generator/index.js';
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
      (generatedFile) => generatedFile.path === '.claude/commands/workflow-fix.md',
    );

    expect(workflowFix?.content).toContain('If `pnpm test` fails on files **unrelated**');
    expect(workflowFix?.content).not.toContain('If `` or `pnpm test` fails');
    expect(workflowFix?.content).not.toContain('`null`');
  });
});
