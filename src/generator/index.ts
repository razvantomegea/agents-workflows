import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratedFile, GeneratorContext } from './types.js';
import { cavemanCompress } from '../utils/caveman-compress.js';
import { buildContext } from './build-context.js';
import { listPartials } from './list-partials.js';
import { generateAgents } from './generate-agents.js';
import { generateCommands } from './generate-commands.js';
import { generatePlugins } from './generate-plugins.js';
import { generateRootConfig } from './generate-root-config.js';
import { generateScripts } from './generate-scripts.js';
import { generateCursorConfig } from './cursor/index.js';
import { generateCopilotConfig } from './copilot/index.js';
import { generateWindsurfConfig } from './windsurf/index.js';
import { generateRefinePrompt } from './generate-refine-prompt.js';

export interface GenerateAllOptions {
  /** Emit `AGENTS_REFINE.md` (default `true`). */
  refinePrompt?: boolean;
}

export type TargetGenerator = (
  config: StackConfig,
  context: GeneratorContext,
) => Promise<GeneratedFile[]>;

export const TARGET_GENERATORS: readonly TargetGenerator[] = [
  generateAgents,
  generateCommands,
  generatePlugins,
  generateRootConfig,
  generateScripts,
  generateCursorConfig,
  generateCopilotConfig,
  generateWindsurfConfig,
];

function applyPostProcessors(files: GeneratedFile[], config: StackConfig): GeneratedFile[] {
  if (!config.cavemanStyle) return files;
  return files.map((generatedFile: GeneratedFile) =>
    generatedFile.path.endsWith('.md')
      ? { ...generatedFile, content: cavemanCompress(generatedFile.content) }
      : generatedFile,
  );
}

export async function generateAll(
  config: StackConfig,
  options: GenerateAllOptions = {},
): Promise<GeneratedFile[]> {
  const baseContext = buildContext(config);
  const discoveredPartials = await listPartials();
  const context: GeneratorContext = { ...baseContext, discoveredPartials };
  const groups = await Promise.all(
    TARGET_GENERATORS.map((generator: TargetGenerator) => generator(config, context)),
  );
  const files = groups.flat();
  if (options.refinePrompt !== false) {
    files.push(await generateRefinePrompt(config, context));
  }
  return applyPostProcessors(files, config);
}

export { buildContext } from './build-context.js';
export { buildReviewChecklist } from './review-checklist-rules.js';
export type { GeneratorContext, GeneratedFile, ReviewChecklistItem } from './types.js';
export {
  writeFileSafe,
  configureWriteSession,
  resetWriteSession,
  _setPromptFn,
  _restoreDefaultPromptFn,
} from './write-file.js';
export type {
  WriteFileResult,
  WriteFileStatus,
  MergeStrategy,
  MergeFunction,
  WriteFileInput,
  PromptAnswer,
  PromptFn,
} from './write-file.js';
export { mergeJson, MANAGED_JSON_KEYS } from './merge-json.js';
export type { JsonValue, JsonObject, JsonArray } from './merge-json.js';
export { mergeMarkdown } from './merge-markdown.js';
