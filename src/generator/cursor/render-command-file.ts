import { renderTemplate } from '../../utils/template-renderer.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import type { StackConfig } from '../../schema/stack-config.js';

interface CursorCommand {
  key: keyof StackConfig['selectedCommands'];
  templateFile: string;
  outputName: string;
}

// `workflowLonghorizon` and `workflowTcr` are Claude/Codex-only by PRD scope (E11.T2);
// not emitted for Cursor. Extend this list deliberately when those flows mature.
const CURSOR_COMMANDS: readonly CursorCommand[] = [
  { key: 'workflowPlan', templateFile: 'commands/workflow-plan.md.ejs', outputName: 'workflow-plan.md' },
  { key: 'workflowFix', templateFile: 'commands/workflow-fix.md.ejs', outputName: 'workflow-fix.md' },
  { key: 'externalReview', templateFile: 'commands/external-review.md.ejs', outputName: 'external-review.md' },
];

export interface RenderCommandFilesArgs {
  selectedCommands: StackConfig['selectedCommands'];
  context: GeneratorContext;
}

/**
 * Renders Cursor command files for every enabled command in `selectedCommands`.
 *
 * Filters `CURSOR_COMMANDS` (which omits `workflowLonghorizon` and
 * `workflowTcr` — Claude/Codex-only by PRD E11.T2) to those whose key flag is
 * `true` in `args.selectedCommands`, renders each template, and returns a
 * `GeneratedFile` targeting `.cursor/commands/<outputName>`.
 *
 * All renders run concurrently via `Promise.all`.
 *
 * @param args - Object containing:
 *   - `selectedCommands` — subset of `StackConfig['selectedCommands']` used to
 *     filter which Cursor commands to emit.
 *   - `context` — generator context passed to each EJS template.
 * @returns An array of `GeneratedFile` entries under `.cursor/commands/`.
 */
export async function renderCursorCommandFiles(args: RenderCommandFilesArgs): Promise<GeneratedFile[]> {
  const { selectedCommands, context } = args;
  const enabled = CURSOR_COMMANDS.filter((command: CursorCommand) => selectedCommands[command.key]);
  return Promise.all(enabled.map(async (command: CursorCommand) => {
    const content = await renderTemplate(command.templateFile, context);
    return { path: `.cursor/commands/${command.outputName}`, content };
  }));
}
