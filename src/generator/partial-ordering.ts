import type { PartialActivation, PartialActivationMode } from './partial-activation-map.js';

const PREFIX_BY_MODE: Readonly<Record<PartialActivationMode, string>> = {
  always: '00',
  glob: '10',
  modelDecision: '20',
  manual: '30',
};

/**
 * Returns the two-digit numeric prefix for a partial's activation mode.
 *
 * Prefixes are: `'00'` (always), `'10'` (glob), `'20'` (modelDecision),
 * `'30'` (manual).  Prepending this prefix to a filename causes IDE rule lists
 * to present the most-critical partials first.
 *
 * @param activation - Object containing the `mode` field of a `PartialActivation`.
 * @returns A two-character numeric string prefix.
 */
export function orderingPrefix(activation: Readonly<{ mode: PartialActivationMode }>): string {
  return PREFIX_BY_MODE[activation.mode];
}

/**
 * Constructs the ordered output filename for a partial rule file.
 *
 * Combines `orderingPrefix(activation)`, the slug, and the file extension into
 * the form `<prefix>-<slug>.<extension>` (e.g. `00-deny-destructive-ops.mdc`).
 *
 * @param args - Object containing:
 *   - `slug` — the partial template slug.
 *   - `activation` — the resolved `PartialActivation` for the slug.
 *   - `extension` — file extension without leading dot (e.g. `'mdc'`, `'md'`).
 * @returns The ordered filename string.
 */
export function orderedFilename(args: Readonly<{ slug: string; activation: PartialActivation; extension: string }>): string {
  const { slug, activation, extension } = args;
  return `${orderingPrefix(activation)}-${slug}.${extension}`;
}
