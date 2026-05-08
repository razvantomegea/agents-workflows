import type { MergeFunction } from './write-file.js';

export const REPLACE_WITH_INCOMING: MergeFunction = (
  args: { existing: string; incoming: string; path: string },
): string => args.incoming;
