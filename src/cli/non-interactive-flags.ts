import { type IsolationChoice, ISOLATION_CHOICES } from '../schema/stack-config.js';

export interface RawNonInteractiveFlags {
  nonInteractive?: boolean;
  isolation?: IsolationChoice;
  acceptRisks?: boolean;
}

export interface NonInteractiveFlags {
  enabled: boolean;
  isolation: IsolationChoice | null;
  acceptedHostOsRisk: boolean;
}

export class NonInteractiveFlagsError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NonInteractiveFlagsError.prototype);
    this.name = 'NonInteractiveFlagsError';
  }
}

const DISABLED_RESULT: NonInteractiveFlags = {
  enabled: false,
  isolation: null,
  acceptedHostOsRisk: false,
};

function disabledWithIsolation(isolation: IsolationChoice | undefined): NonInteractiveFlags {
  if (isolation === undefined) return DISABLED_RESULT;
  return { enabled: false, isolation, acceptedHostOsRisk: false };
}

/**
 * Validates and normalises the three non-interactive CLI flags.
 *
 * Rules (in priority order):
 *  1. `--no-non-interactive` (commander emits `nonInteractive === false`) → always disabled,
 *     but `--isolation=<env>` still propagates as the documented baseline.
 *  2. `nonInteractive` not set → safe default. `--isolation=<env>` alone propagates the
 *     baseline; no error.
 *  3. `nonInteractive === true` without `--isolation` → error (exit 1 via handleSafetyErrors).
 *  4. `--isolation=host-os` without `--accept-risks` → error only when enabling NI.
 *  5. All other `nonInteractive === true` cases → enabled with the given isolation.
 */
export function parseNonInteractiveFlags(raw: RawNonInteractiveFlags): NonInteractiveFlags {
  // Rule 1: --no-non-interactive wins, but isolation may still document the baseline.
  if (raw.nonInteractive === false) return disabledWithIsolation(raw.isolation);

  // Rule 2: flag not present → safe default; isolation may still document the baseline.
  if (raw.nonInteractive !== true) return disabledWithIsolation(raw.isolation);

  // Rule 3: --non-interactive requires --isolation.
  if (raw.isolation === undefined || !ISOLATION_CHOICES.includes(raw.isolation)) {
    throw new NonInteractiveFlagsError('--non-interactive requires --isolation=<env>');
  }

  // Rule 4: host-os requires --accept-risks when enabling NI.
  if (raw.isolation === 'host-os' && raw.acceptRisks !== true) {
    throw new NonInteractiveFlagsError(
      '--non-interactive --isolation=host-os requires --accept-risks (see PRD §1.9.1)',
    );
  }

  return {
    enabled: true,
    isolation: raw.isolation,
    acceptedHostOsRisk: raw.acceptRisks === true,
  };
}
