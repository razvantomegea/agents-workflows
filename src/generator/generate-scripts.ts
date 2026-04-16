import { renderTemplate } from '../utils/template-renderer.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

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
