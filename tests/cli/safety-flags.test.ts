import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { parseSafetyFlags, handleSafetyErrors } from '../../src/cli/safety-flags.js';
import { logger } from '../../src/utils/index.js';

describe('handleSafetyErrors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves normally when the action resolves', async () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((((_code?: number) => undefined) as never));

    await handleSafetyErrors(async () => {
      // no-op action
    });

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('logs the error message and exits with 1 when action throws SafetyFlagsError', async () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((((_code?: number) => undefined) as never));
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation((() => undefined) as never);

    await handleSafetyErrors(async () => {
      parseSafetyFlags({ yes: true, noPrompt: true });
    });

    expect(errorSpy).toHaveBeenCalledWith('--yes and --no-prompt are mutually exclusive.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('propagates non-SafetyFlagsError errors without calling process.exit', async () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((((_code?: number) => undefined) as never));

    const unexpected = new Error('unexpected failure');

    await expect(
      handleSafetyErrors(async () => {
        throw unexpected;
      }),
    ).rejects.toThrow('unexpected failure');

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
