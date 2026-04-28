import { select } from '@inquirer/prompts';
import type { DetectedStack } from '../detector/types.js';
import type { ImplementerVariant } from '../schema/stack-config.js';
import { IMPLEMENTER_VARIANTS } from '../schema/stack-config.js';
import { getApplicableImplementerVariant } from '../generator/implementer-routing.js';

const VARIANT_CHOICE_LABELS: Readonly<Record<ImplementerVariant, string>> = {
  'generic': 'generic — Stack-agnostic baseline',
  'typescript': 'typescript — Plain TypeScript (Epic 17 body)',
  'javascript': 'javascript — Plain JavaScript (Epic 17 body)',
  'react-ts': 'react-ts — React + TypeScript (incl. Next.js / Expo / RN / Remix)',
  'node-ts-backend': 'node-ts-backend — Node TS backend (Nest / Express / Fastify / Hono)',
  'python': 'python — Python (FastAPI / Django / Flask / scripts)',
  'go': 'go — Go services & CLIs',
  'rust': 'rust — Rust crates & services',
  'java-spring': 'java-spring — Java + Spring Boot',
  'dotnet-csharp': 'dotnet-csharp — C# / ASP.NET Core',
  'vue': 'vue — Vue 3 / Nuxt (Epic 17 body)',
  'angular': 'angular — Angular + TypeScript (Epic 17 body)',
  'svelte': 'svelte — Svelte 5 / SvelteKit',
};

const VARIANT_CHOICES: ReadonlyArray<Readonly<{ name: string; value: ImplementerVariant }>> =
  IMPLEMENTER_VARIANTS.map((variant: ImplementerVariant) => ({
    name: VARIANT_CHOICE_LABELS[variant],
    value: variant,
  }));

/**
 * Prompt the user to select an implementer variant.
 * Defaults to the variant best matching the detected stack.
 *
 * @param detected - Detected stack used to pre-select the best default variant.
 * @returns The selected implementer variant string.
 */
export async function askImplementerVariant(detected: DetectedStack): Promise<ImplementerVariant> {
  return select<ImplementerVariant>({
    message: 'Implementer agent variant:',
    choices: [...VARIANT_CHOICES],
    default: getApplicableImplementerVariant(detected),
  });
}
