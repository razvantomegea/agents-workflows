import { confirm } from '@inquirer/prompts';

/**
 * Prompt the user for code convention preferences.
 *
 * @returns An object with test colocation, barrel exports, and strict types preferences.
 */
export async function askConventions(): Promise<{
  testColocation: boolean;
  barrelExports: boolean;
  strictTypes: boolean;
}> {
  const testColocation = await confirm({ message: 'Colocate tests next to source files?', default: true });
  const barrelExports = await confirm({ message: 'Use barrel exports (index.ts)?', default: true });
  const strictTypes = await confirm({ message: 'Strict types (no any)?', default: true });

  return { testColocation, barrelExports, strictTypes };
}
