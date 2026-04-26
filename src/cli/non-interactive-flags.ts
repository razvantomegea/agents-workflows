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

/**
 * Validates and normalises the three non-interactive CLI flags.
 *
 * Rules (in priority order):
 *  1. `--no-non-interactive` (commander emits `nonInteractive === false`) → always disabled.
 *  2. `nonInteractive` not set → safe default (disabled).
 *  3. `nonInteractive === true` without `--isolation` → error (exit 1 via handleSafetyErrors).
 *  4. `--isolation=host-os` without `--accept-risks` → error (exit 1).
 *  5. All other `nonInteractive === true` cases → enabled with the given isolation.
 */
export function parseNonInteractiveFlags(raw: RawNonInteractiveFlags): NonInteractiveFlags {
  // Rule 1: --no-non-interactive wins unconditionally.
  if (raw.nonInteractive === false) return DISABLED_RESULT;

  // Rule 2: flag not present at all → safe default.
  if (raw.nonInteractive !== true) return DISABLED_RESULT;

  // Rule 3: --non-interactive requires --isolation.
  if (raw.isolation === undefined || !ISOLATION_CHOICES.includes(raw.isolation)) {
    throw new NonInteractiveFlagsError('--non-interactive requires --isolation=<env>');
  }

  // Rule 4: host-os requires --accept-risks.
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
