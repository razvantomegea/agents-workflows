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
const { askNonInteractiveMode, HOST_OS_ACCEPT_PHRASE } = await import(
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

  it('returns SECURITY_DEFAULTS when yes=true and no other flags', async () => {
    const result = await askNonInteractiveMode({ yes: true });

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns SECURITY_DEFAULTS when nonInteractive=false', async () => {
    const result = await askNonInteractiveMode({ nonInteractive: false });

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns SECURITY_DEFAULTS when user declines the enable confirm', async () => {
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

  it('returns nonInteractiveMode=true with docker when user accepts and selects docker', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockSelect.mockResolvedValueOnce('docker');

    const before = Date.now();
    const result = await askNonInteractiveMode({});
    const after = Date.now();

    expect(result.nonInteractiveMode).toBe(true);
    expect(result.runsIn).toBe('docker');
    assertTimestampWithinTolerance({
      before,
      after,
      timestamp: result.disclosureAcknowledgedAt,
    });
  });

  it('returns SECURITY_DEFAULTS when user types a wrong phrase for host-os', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockSelect.mockResolvedValueOnce('host-os');
    mockInput.mockResolvedValueOnce('yes');

    const result = await askNonInteractiveMode({});

    expect(result).toEqual(SECURITY_DEFAULTS);
  });

  it('returns nonInteractiveMode=true with host-os when exact accept phrase is typed', async () => {
    mockConfirm.mockResolvedValueOnce(true);
    mockSelect.mockResolvedValueOnce('host-os');
    mockInput.mockResolvedValueOnce(HOST_OS_ACCEPT_PHRASE);

    const result = await askNonInteractiveMode({});

    expect(result.nonInteractiveMode).toBe(true);
    expect(result.runsIn).toBe('host-os');
    expect(result.disclosureAcknowledgedAt).not.toBeNull();
  });
});
