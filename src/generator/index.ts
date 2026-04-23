import type { StackConfig } from '../schema/stack-config.js';
import type { GeneratedFile } from './types.js';
import { buildContext } from './build-context.js';
import { generateAgents } from './generate-agents.js';
import { generateCommands } from './generate-commands.js';
import { generateRootConfig } from './generate-root-config.js';
import { generateScripts } from './generate-scripts.js';

export async function generateAll(config: StackConfig): Promise<GeneratedFile[]> {
  const context = buildContext(config);

  const [agents, commands, rootConfig, scripts] = await Promise.all([
    generateAgents(config, context),
    generateCommands(config, context),
    generateRootConfig(config, context),
    generateScripts(config, context),
  ]);

  return [...agents, ...commands, ...rootConfig, ...scripts];
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
