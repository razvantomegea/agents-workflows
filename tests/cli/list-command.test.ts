import { readAvailableItems } from '../../src/cli/list-command.js';

describe('readAvailableItems', () => {
  it('reads agent and command metadata from template frontmatter', async () => {
    const items = await readAvailableItems();
    const names = items.map((item) => item.name);

    expect(names).toContain('architect');
    expect(names).toContain('workflow-plan');
    expect(items.find((item) => item.name === 'workflow-plan')?.description)
      .toBe('End-to-end feature planning and execution workflow.');
  });
});
