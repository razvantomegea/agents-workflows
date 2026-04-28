import { resolveMergeStrategyForUpdate } from '../../src/cli/update-command.js';

describe('resolveMergeStrategyForUpdate', () => {
  it('returns the explicit mergeStrategy when one was provided', () => {
    expect(resolveMergeStrategyForUpdate({ mergeStrategy: 'overwrite' })).toBe('overwrite');
    expect(resolveMergeStrategyForUpdate({ mergeStrategy: 'keep' })).toBe('keep');
    expect(resolveMergeStrategyForUpdate({ mergeStrategy: 'merge' })).toBe('merge');
  });

  it('defaults to merge when --non-interactive is set without yes/noPrompt/mergeStrategy', () => {
    expect(resolveMergeStrategyForUpdate({ nonInteractive: true })).toBe('merge');
  });

  it('returns undefined when nonInteractive is paired with --yes (yes wins)', () => {
    expect(resolveMergeStrategyForUpdate({ nonInteractive: true, yes: true })).toBeUndefined();
  });

  it('returns undefined when nonInteractive is paired with --no-prompt (skip wins)', () => {
    expect(resolveMergeStrategyForUpdate({ nonInteractive: true, noPrompt: true })).toBeUndefined();
  });

  it('returns undefined for fully interactive runs (no flags set)', () => {
    expect(resolveMergeStrategyForUpdate({})).toBeUndefined();
  });

  it('respects an explicit mergeStrategy even when nonInteractive is set', () => {
    expect(
      resolveMergeStrategyForUpdate({ nonInteractive: true, mergeStrategy: 'overwrite' }),
    ).toBe('overwrite');
  });
});
