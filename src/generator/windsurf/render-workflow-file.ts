import { renderTemplate } from '../../utils/template-renderer.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';
import type { StackConfig } from '../../schema/stack-config.js';

interface WindsurfWorkflowDef {
  key: keyof StackConfig['selectedCommands'];
  templateFile: string;
  outputName: string;
  description: string;
}

// `workflowLonghorizon` and `workflowTcr` are Claude/Codex-only by PRD scope (E11.T4);
// not emitted as Windsurf workflows. Extend deliberately when those flows mature.
const WINDSURF_WORKFLOWS: readonly WindsurfWorkflowDef[] = [
  {
    key: 'workflowPlan',
    templateFile: 'commands/workflow-plan.md.ejs',
    outputName: 'workflow-plan.md',
    description: 'Plan and execute a feature or bug fix end-to-end.',
  },
  {
    key: 'workflowFix',
    templateFile: 'commands/workflow-fix.md.ejs',
    outputName: 'workflow-fix.md',
    description: 'Fix verified QA issues from a QA report.',
  },
  {
    key: 'externalReview',
    templateFile: 'commands/external-review.md.ejs',
    outputName: 'external-review.md',
    description: 'Run an external review tool and write findings to QA.md.',
  },
];

export interface RenderWindsurfWorkflowsArgs {
  selectedCommands: StackConfig['selectedCommands'];
  context: GeneratorContext;
}

/**
 * Renders Windsurf workflow files for every enabled command in `selectedCommands`.
 *
 * Filters `WINDSURF_WORKFLOWS` (which omits `workflowLonghorizon` and
 * `workflowTcr` — Claude/Codex-only by PRD E11.T4) to those whose key flag is
 * `true` in `args.selectedCommands`, renders each body template, then wraps it
 * in `windsurf/workflow.md.ejs` with a description field.
 *
 * All renders run concurrently via `Promise.all`.
 *
 * @param args - Object containing:
 *   - `selectedCommands` — subset of `StackConfig['selectedCommands']` used to
 *     filter which Windsurf workflows to emit.
 *   - `context` — generator context passed to each EJS template.
 * @returns An array of `GeneratedFile` entries under `.windsurf/workflows/`.
 */
export async function renderWindsurfWorkflowFiles(args: RenderWindsurfWorkflowsArgs): Promise<GeneratedFile[]> {
  const { selectedCommands, context } = args;
  const enabled = WINDSURF_WORKFLOWS.filter(
    (workflow: WindsurfWorkflowDef) => selectedCommands[workflow.key],
  );
  return Promise.all(enabled.map(async (workflow: WindsurfWorkflowDef) => {
    const body = await renderTemplate(workflow.templateFile, context);
    const content = await renderTemplate('windsurf/workflow.md.ejs', {
      ...context,
      description: workflow.description,
      body,
    });
    return { path: `.windsurf/workflows/${workflow.outputName}`, content };
  }));
}
