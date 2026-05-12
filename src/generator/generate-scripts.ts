import { renderTemplate } from '../utils/template-renderer.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

/**
 * Generates helper shell scripts for the enabled AI tool targets.
 *
 * Emits the following files based on the `config.targets` flags:
 * - `config.targets.claudeCode` → `.claude/scripts/cursor-task.sh`,
 *   `.claude/scripts/run-parallel.sh`
 * - `config.targets.codexCli`   → `.codex/scripts/sync-codex.sh`,
 *   `.codex/scripts/sync-codex.ps1`
 *
 * @param config - `StackConfig` slice consumed: `targets` (`claudeCode`,
 *   `codexCli`).
 * @param _context - Generator context (accepted to satisfy the
 *   `TargetGenerator` contract; not used by this generator).
 * @returns An array of `GeneratedFile` entries for each emitted script.
 */
export async function generateScripts(
  config: StackConfig,
  _context: GeneratorContext,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const data = {} as Record<string, unknown>;

  if (config.targets.claudeCode) {
    const cursorTask = await renderTemplate('scripts/cursor-task.sh.ejs', data);
    files.push({ path: '.claude/scripts/cursor-task.sh', content: cursorTask });

    const runParallel = await renderTemplate('scripts/run-parallel.sh.ejs', data);
    files.push({ path: '.claude/scripts/run-parallel.sh', content: runParallel });
  }

  if (config.targets.codexCli) {
    const syncSh = await renderTemplate('scripts/sync-codex.sh.ejs', data);
    files.push({ path: '.codex/scripts/sync-codex.sh', content: syncSh });

    const syncPs1 = await renderTemplate('scripts/sync-codex.ps1.ejs', data);
    files.push({ path: '.codex/scripts/sync-codex.ps1', content: syncPs1 });
  }

  return files;
}
