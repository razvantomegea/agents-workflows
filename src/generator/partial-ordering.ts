import type { PartialActivation, PartialActivationMode } from './partial-activation-map.js';

const PREFIX_BY_MODE: Readonly<Record<PartialActivationMode, string>> = {
  always: '00',
  glob: '10',
  modelDecision: '20',
  manual: '30',
};

export function orderingPrefix(activation: Readonly<{ mode: PartialActivationMode }>): string {
  return PREFIX_BY_MODE[activation.mode];
}

export function orderedFilename(args: Readonly<{ slug: string; activation: PartialActivation; extension: string }>): string {
  const { slug, activation, extension } = args;
  return `${orderingPrefix(activation)}-${slug}.${extension}`;
}
