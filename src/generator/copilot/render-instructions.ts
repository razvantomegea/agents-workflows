import { renderTemplate } from '../../utils/template-renderer.js';
import type { GeneratorContext, GeneratedFile } from '../types.js';

export async function renderCopilotInstructions(context: GeneratorContext): Promise<GeneratedFile> {
  const content = await renderTemplate('copilot/copilot-instructions.md.ejs', context);
  return { path: '.github/copilot-instructions.md', content };
}
