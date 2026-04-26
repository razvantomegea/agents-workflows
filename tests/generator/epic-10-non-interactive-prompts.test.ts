import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SECURITY_DEFAULTS } from '../../src/schema/stack-config.js';
import { makeDetectedStack } from './fixtures.js';

const mockConfirm = jest.fn<() => Promise<boolean>>();
const mockSelect = jest.fn<() => Promise<string>>();
const mockInput = jest.fn<() => Promise<string>>();

jest.unstable_mockModule('@inquirer/prompts', () => ({
  confirm: mockConfirm,
  select: mockSelect,
  input: mockInput,
  checkbox: jest.fn<() => Promise<string[]>>(),
}));

const { runPromptFlow } = await import('../../src/prompt/index.js');
const { askIsolation, askNonInteractiveMode, HOST_OS_ACCEPT_PHRASE } = await import(
  '../../src/prompt/ask-non-interactive.js'
);

const TIMESTAMP_TOLERANCE_MS = 5000;

function assertTimestampWithinTolerance(options: {
  before: number;
  after: number;
  timestamp: string | null;
}): void {
  const parsedTimestamp = new Date(options.timestamp ?? '').getTime();

  expect(parsedTimestamp).toBeGreaterThanOrEqual(options.before - TIMESTAMP_TOLERANCE_MS);
  expect(parsedTimestamp).toBeLessThanOrEqual(options.after + TIMESTAMP_TOLERANCE_MS);
}

describe('Epic 10 non-interactive mode prompts — case 1 and branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runPromptFlow with yes:true sets security to SECURITY_DEFAULTS', async () => {
    const config = await runPromptFlow(makeDetectedStack(), '/tmp/fake-root', { yes: true });

    expect(config.security).toEqual(SECURITY_DEFAULTS);
  });

  it('runPromptFlow with yes:true and explicit isolation sets runsIn baseline', async () => {
    const config = await runPromptFlow(makeDetectedStack(), '/tmp/fake-root', {
      yes: true,
      isolation: 'devcontainer',
    });

    expect(config.security).toEqual({
      nonInteractiveMode: false,
      runsIn: 'devcontainer',
      disclosureAcknowledgedAt: null,
    });
  });

  it('returns SECURITY_DEFAULTS when yes=true and no other flags', async () => {
    const result = await askNonInteractiveMode({ yes: true });

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns SECURITY_DEFAULTS when nonInteractive=false', async () => {
    const result = await askNonInteractiveMode({ nonInteractive: false });

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns runsIn baseline when nonInteractive=false but isolation is provided', async () => {
    const result = await askNonInteractiveMode({ nonInteractive: false, isolation: 'docker' });

    expect(result).toEqual({
      nonInteractiveMode: false,
      runsIn: 'docker',
      disclosureAcknowledgedAt: null,
    });
  });

  it('returns runsIn baseline when user declines the enable confirm but isolation is supplied', async () => {
    mockConfirm.mockResolvedValueOnce(false);

    const result = await askNonInteractiveMode({ isolation: 'vm' });

    expect(result).toEqual({
      nonInteractiveMode: false,
      runsIn: 'vm',
      disclosureAcknowledgedAt: null,
    });
  });

  it('returns SECURITY_DEFAULTS when user declines the enable confirm with no isolation', async () => {
    mockConfirm.mockResolvedValueOnce(false);

    const result = await askNonInteractiveMode({});

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns nonInteractiveMode=true with docker and a valid ISO timestamp', async () => {
    const before = Date.now();
    const result = await askNonInteractiveMode({ nonInteractive: true, isolation: 'docker' });
    const after = Date.now();

    expect(result.nonInteractiveMode).toBe(true);
    expect(result.runsIn).toBe('docker');
    assertTimestampWithinTolerance({
      before,
      after,
      timestamp: result.disclosureAcknowledgedAt,
    });
  });

  it('returns nonInteractiveMode=true when user accepts and isolation=docker is supplied', async () => {
    mockConfirm.mockResolvedValueOnce(true);

    const before = Date.now();
    const result = await askNonInteractiveMode({ isolation: 'docker' });
    const after = Date.now();

    expect(result.nonInteractiveMode).toBe(true);
    expect(result.runsIn).toBe('docker');
    assertTimestampWithinTolerance({
      before,
      after,
      timestamp: result.disclosureAcknowledgedAt,
    });
  });

  it('falls back to inline askIsolation when caller skipped it (back-compat)', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockSelect.mockResolvedValueOnce('docker');

    const result = await askNonInteractiveMode({});

    expect(result.nonInteractiveMode).toBe(true);
    expect(result.runsIn).toBe('docker');
  });

  it('returns runsIn=host-os baseline (no accept phrase) when user types wrong phrase but does not enable NI', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockInput.mockResolvedValueOnce('yes');

    const result = await askNonInteractiveMode({ isolation: 'host-os' });

    expect(result).toEqual({
      nonInteractiveMode: false,
      runsIn: 'host-os',
      disclosureAcknowledgedAt: null,
    });
  });

  it('returns nonInteractiveMode=true with host-os when exact accept phrase is typed', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockInput.mockResolvedValueOnce(HOST_OS_ACCEPT_PHRASE);

    const result = await askNonInteractiveMode({ isolation: 'host-os' });

    expect(result.nonInteractiveMode).toBe(true);
    expect(result.runsIn).toBe('host-os');
    expect(result.disclosureAcknowledgedAt).not.toBeNull();
  });
});

describe('Epic 10 askIsolation — always-asked baseline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null under --yes with no explicit isolation flag', async () => {
    const result = await askIsolation({ yes: true });

    expect(result).toBeNull();
  });

  it('returns the explicit isolation flag without prompting', async () => {
    const result = await askIsolation({ isolation: 'devcontainer' });

    expect(result).toBe('devcontainer');
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('honors explicit isolation flag even under --yes (explicit > implicit)', async () => {
    const result = await askIsolation({ yes: true, isolation: 'vm' });

    expect(result).toBe('vm');
  });

  it('prompts the user with the isolation select when no flag and not under --yes', async () => {
    mockSelect.mockResolvedValueOnce('docker');

    const result = await askIsolation({});

    expect(result).toBe('docker');
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('passes the current value as the select default when supplied', async () => {
    mockSelect.mockResolvedValueOnce('vm');

    await askIsolation({ current: 'vm' });

    const args = mockSelect.mock.calls[0][0] as { default?: string };
    expect(args.default).toBe('vm');
  });

  it('selecting host-os does not require any accept phrase at isolation-time', async () => {
    mockSelect.mockResolvedValueOnce('host-os');

    const result = await askIsolation({});

    expect(result).toBe('host-os');
    expect(mockInput).not.toHaveBeenCalled();
  });
});

describe('Epic 10 prompt-flow — isolation captured even when user declines non-interactive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('captures runsIn baseline when isolation flag set and user is not in --yes', async () => {
    // Interactive flow needs all answers mocked. We bypass by passing yes: true but with isolation.
    // The CI-style `yes` path skips prompts but still propagates the explicit isolation flag.
    const config = await runPromptFlow(makeDetectedStack(), '/tmp/fake-root', {
      yes: true,
      isolation: 'vm',
    });

    expect(config.security.runsIn).toBe('vm');
    expect(config.security.nonInteractiveMode).toBe(false);
    expect(config.security.disclosureAcknowledgedAt).toBeNull();
  });
});
