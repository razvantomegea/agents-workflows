export const MANAGED_END_SENTINEL = '<!-- agents-workflows:managed-end -->';

export interface SentinelSplit {
  managed: string;
  userTail: string;
}

/**
 * Splits content at the FIRST occurrence of `MANAGED_END_SENTINEL` so that any
 * later occurrence of the literal sentinel string in user-authored content is
 * preserved as part of `userTail` and not reclassified as managed.
 *
 * Invariant: each managed section emits exactly one `MANAGED_END_SENTINEL`.
 * Templates that emit it more than once produce undefined merge results.
 */
export function splitOnManagedSentinel(content: string): SentinelSplit {
  const idx = content.indexOf(MANAGED_END_SENTINEL);
  if (idx === -1) return { managed: content, userTail: '' };
  const after = idx + MANAGED_END_SENTINEL.length;
  return { managed: content.slice(0, after), userTail: content.slice(after) };
}

/**
 * Shared merge logic for all managed-sentinel-delimited files (MDC, Windsurf rules, etc.).
 * Preserves any user-authored content appended after the managed sentinel block.
 */
export function mergeManagedTail({ existing, incoming }: { existing: string; incoming: string }): string {
  const existingTail = splitOnManagedSentinel(existing).userTail;
  if (existingTail.trim() === '') return incoming;
  const incomingManaged = splitOnManagedSentinel(incoming).managed;
  return `${incomingManaged}${existingTail}`;
}
