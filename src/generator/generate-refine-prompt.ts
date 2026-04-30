import type { StackConfig } from '../schema/stack-config.js';
import { renderTemplate } from '../utils/template-renderer.js';
import type { GeneratorContext, GeneratedFile } from './types.js';

export const REFINE_PROMPT_PATH = 'AGENTS_REFINE.md';

/**
 * Render the post-init workspace refinement prompt (`AGENTS_REFINE.md`).
 *
 * The prompt is the executable handoff users give their agent so the freshly
 * generated agent files get tailored to this workspace's domain, idioms, and
 * conventions that the stack detector cannot infer. Planning-only per PRD §1.3.
 *
 * @param config - Resolved stack config (provides the `agents` enable map).
 * @param context - Generator context built from the resolved StackConfig.
 * @returns Single `GeneratedFile` entry for `AGENTS_REFINE.md`.
 */
export async function generateRefinePrompt(
  config: StackConfig,
  context: GeneratorContext,
): Promise<GeneratedFile> {
  const content = await renderTemplate('refine/AGENTS_REFINE.md.ejs', {
    ...context,
    agents: config.agents,
  });
  return { path: REFINE_PROMPT_PATH, content };
}
