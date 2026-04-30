import { renderTemplate } from '../../utils/template-renderer.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';

/**
 * Renders the GitHub Copilot global instructions file.
 *
 * Renders `copilot/copilot-instructions.md.ejs` with the supplied generator
 * context and returns a `GeneratedFile` entry targeting
 * `.github/copilot-instructions.md`.
 *
 * @param context - Generator context passed to the EJS template.
 * @returns A `GeneratedFile` with `path` set to `.github/copilot-instructions.md`.
 */
export async function renderCopilotInstructions(context: GeneratorContext): Promise<GeneratedFile> {
  const content = await renderTemplate('copilot/copilot-instructions.md.ejs', context);
  return { path: '.github/copilot-instructions.md', content };
}
