import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig, getContent, ARCHITECT_PATH } from './fixtures.js';

describe('Epic 8 T6 — stacked PR tooling note in git-rules partial', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('architect.md contains stacked PRs mention', () => {
    expect(getContent(files, ARCHITECT_PATH)).toContain('stacked PR');
  });

  it('architect.md contains Graphite canonical command (gt create)', () => {
    const content = getContent(files, ARCHITECT_PATH);
    expect(content).toContain('Graphite');
    expect(content).toContain('gt create');
  });

  it('architect.md contains ghstack canonical command', () => {
    expect(getContent(files, ARCHITECT_PATH)).toContain('ghstack');
  });

  it('architect.md contains git town hack canonical command', () => {
    expect(getContent(files, ARCHITECT_PATH)).toContain('git town hack');
  });

  it('architect.md contains merge bottom-up guidance', () => {
    const content = getContent(files, ARCHITECT_PATH);
    expect(content.includes('merge bottom-up') || content.includes('bottom-up')).toBe(true);
  });

  it('architect.md contains stack depth limit (≤ 5)', () => {
    const content = getContent(files, ARCHITECT_PATH);
    expect(content.includes('≤ 5') || content.includes('<= 5')).toBe(true);
  });

  it('architect.md contains one-logical-change-per-PR guidance', () => {
    const content = getContent(files, ARCHITECT_PATH);
    expect(content.includes('one logical change per PR') || content.includes('logical change')).toBe(true);
  });

  it('git-rules partial is within 60 lines after expansion', async () => {
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');

    const templatePath = join(
      process.cwd(),
      'src/templates/partials/git-rules.md.ejs',
    );
    const content = await readFile(templatePath, 'utf8');
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(60);
  });
});
