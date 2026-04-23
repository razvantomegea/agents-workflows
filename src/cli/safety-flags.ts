import { configureWriteSession } from '../generator/index.js';
import type { MergeStrategy } from '../generator/index.js';

export interface SafetyFlags {
  yes: boolean;
  noPrompt: boolean;
  mergeStrategy: MergeStrategy | null;
}

export class SafetyFlagsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafetyFlagsError';
  }
}

const VALID_MERGE_STRATEGIES: readonly MergeStrategy[] = ['keep', 'overwrite', 'merge'];

function isMergeStrategy(value: string): value is MergeStrategy {
  return (VALID_MERGE_STRATEGIES as readonly string[]).includes(value);
}

export function parseSafetyFlags(raw: {
  yes?: boolean;
  noPrompt?: boolean;
  mergeStrategy?: string;
}): SafetyFlags {
  const yes = raw.yes ?? false;
  const noPrompt = raw.noPrompt ?? false;
  const rawStrategy = raw.mergeStrategy;

  if (rawStrategy !== undefined && !isMergeStrategy(rawStrategy)) {
    throw new SafetyFlagsError(
      `Invalid --merge-strategy "${rawStrategy}". Must be one of: ${VALID_MERGE_STRATEGIES.join(', ')}.`,
    );
  }

  const mergeStrategy: MergeStrategy | null = rawStrategy ?? null;

  if (yes && noPrompt) {
    throw new SafetyFlagsError('--yes and --no-prompt are mutually exclusive.');
  }

  if (yes && mergeStrategy === 'keep') {
    throw new SafetyFlagsError(
      '--yes (overwrite all) contradicts --merge-strategy=keep (skip all).',
    );
  }

  if (noPrompt && mergeStrategy === 'overwrite') {
    throw new SafetyFlagsError(
      '--no-prompt (skip all) contradicts --merge-strategy=overwrite.',
    );
  }

  if (noPrompt && mergeStrategy === 'merge') {
    throw new SafetyFlagsError(
      '--no-prompt (skip all) contradicts --merge-strategy=merge.',
    );
  }

  return { yes, noPrompt, mergeStrategy };
}

export function applySafetyFlags(flags: SafetyFlags): void {
  if (flags.yes) {
    configureWriteSession({ stickyAll: true });
    return;
  }

  if (flags.noPrompt) {
    configureWriteSession({ stickySkip: true });
    return;
  }

  if (flags.mergeStrategy !== null) {
    configureWriteSession({ override: flags.mergeStrategy });
  }
}
