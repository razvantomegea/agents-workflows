export const MANAGED_END_SENTINEL = '<!-- agents-workflows:managed-end -->';

export interface SentinelSplit {
  managed: string;
  userTail: string;
}

export function splitOnManagedSentinel(content: string): SentinelSplit {
  const idx = content.lastIndexOf(MANAGED_END_SENTINEL);
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
