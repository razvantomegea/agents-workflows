import type { GeneratedFile } from '../../src/generator/types.js';
import { renderAllTargets } from '../helpers/render-all-targets.js';

const REQUIRED_DENY_TOKENS: readonly string[] = [
  'rm -rf',
  'git push --force',
  'git reset --hard',
  'git clean -fd',
  'Remove-Item -Recurse -Force',
  'pwsh -Command',
  'iwr',
  'npm publish',
];

describe('multi-IDE deny rules (E9.T6 / E9.T7 / E9.T8)', () => {
  let files: GeneratedFile[] | undefined;

  beforeAll(async () => {
    files = await renderAllTargets();
    if (!files) {
      throw new Error('renderAllTargets() returned no files — multi-IDE suite cannot run');
    }
  });

  it('Cursor emits 00-deny-destructive-ops.mdc with alwaysApply: true and §1.4 deny list', () => {
    const denyRule = files!.find((file: GeneratedFile) => file.path === '.cursor/rules/00-deny-destructive-ops.mdc');
    expect(denyRule).toBeDefined();
    expect(denyRule?.content).toMatch(/^---\n[\s\S]*alwaysApply: true[\s\S]*\n---/);
    for (const token of REQUIRED_DENY_TOKENS) {
      expect(denyRule?.content).toContain(token);
    }
  });

  it('Windsurf emits 00-deny-destructive-ops.md with activation: always_on and §1.4 deny list', () => {
    const denyRule = files!.find((file: GeneratedFile) => file.path === '.windsurf/rules/00-deny-destructive-ops.md');
    expect(denyRule).toBeDefined();
    expect(denyRule?.content).toMatch(/^---\nactivation: always_on/);
    for (const token of REQUIRED_DENY_TOKENS) {
      expect(denyRule?.content).toContain(token);
    }
  });

  it('Copilot instructions render the deny-destructive-ops partial inline + branch-protection note', () => {
    const instructions = files!.find((file: GeneratedFile) => file.path === '.github/copilot-instructions.md');
    expect(instructions).toBeDefined();
    for (const token of REQUIRED_DENY_TOKENS) {
      expect(instructions?.content).toContain(token);
    }
    expect(instructions?.content).toContain('GitHub branch protection');
    expect(instructions?.content).toContain('disallow force-push');
  });
});
