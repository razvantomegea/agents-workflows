import { renderAllTargets } from '../helpers/render-all-targets.js';
import { listPartials } from '../../src/generator/list-partials.js';

describe('multi-target parity', () => {
  it('every partial has a Cursor MDC rule and a Windsurf rule', async () => {
    const files = await renderAllTargets();
    const partials = await listPartials();
    const paths = files.map((f) => f.path);
    for (const partial of partials) {
      const cursorMatch = paths.find((p) => p.startsWith('.cursor/rules/') && p.endsWith(`-${partial.slug}.mdc`));
      const windsurfMatch = paths.find((p) => p.startsWith('.windsurf/rules/') && p.endsWith(`-${partial.slug}.md`));
      expect(cursorMatch).toBeDefined();
      expect(windsurfMatch).toBeDefined();
    }
  });

  it('Copilot instructions cover the curated safety subset', async () => {
    const files = await renderAllTargets();
    const instructions = files.find((f) => f.path === '.github/copilot-instructions.md');
    expect(instructions).toBeDefined();
    const requiredHeadings = [
      'Project context',
      'Dangerous operations',
      'Definition of Done',
    ];
    for (const heading of requiredHeadings) {
      expect(instructions?.content).toContain(heading);
    }
    const requiredKeywords = [
      'Context budget',
      'git push',
      'Memory',
      'MCP',
    ];
    for (const keyword of requiredKeywords) {
      expect(instructions?.content).toContain(keyword);
    }
  });

  it('all three new target surfaces are emitted when all targets enabled', async () => {
    const files = await renderAllTargets();
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.startsWith('.cursor/rules/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('.cursor/commands/'))).toBe(true);
    expect(paths.some((p) => p === '.github/copilot-instructions.md')).toBe(true);
    expect(paths.some((p) => p.startsWith('.github/prompts/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('.windsurf/rules/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('.windsurf/workflows/'))).toBe(true);
  });
});
