import type { DetectedStack } from '../detector/types.js';
import { aggregateLanguages } from '../detector/detect-stack.js';

/**
 * Returns a new DetectedStack with workspaceStacks filtered to only those
 * whose path is included in the given `selectedPaths` set.
 *
 * `languages` is recomputed from the filtered stacks so that `isPolyglot`
 * and polyglot template rendering stay consistent with the user's workspace
 * selection (CRITICAL-1: stale languages after workspace filtering).
 */
export function filterDetectedByWorkspacePaths(
  detected: DetectedStack,
  selectedPaths: readonly string[],
): DetectedStack {
  const selected = new Set(selectedPaths);
  const filteredStacks = detected.workspaceStacks.filter((ws) => selected.has(ws.path));
  return {
    ...detected,
    workspaceStacks: filteredStacks,
    languages: aggregateLanguages(detected.language.value, filteredStacks),
  };
}
