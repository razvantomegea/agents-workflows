import { confirm } from '@inquirer/prompts';

/**
 * Prompts the user to opt into caveman-style post-processing for generated Markdown files.
 *
 * @returns `true` when the user confirms, `false` otherwise (defaults to `false`).
 *
 * @remarks
 * Skipped entirely under `--yes` — callers in `runPromptFlow` short-circuit this question
 * and hard-code `cavemanStyle: false` in the non-interactive branch.
 */
export async function askCavemanStyle(): Promise<boolean> {
  return confirm({
    message: 'Apply caveman style? (runs markdown post-processor on generated .md files, see https://github.com/juliusbrussee/caveman)',
    default: false,
  });
}
