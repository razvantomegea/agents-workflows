import { confirm } from '@inquirer/prompts';

export async function askCavemanStyle(): Promise<boolean> {
  return confirm({
    message: 'Apply caveman style? (runs markdown post-processor on generated .md files, see https://github.com/juliusbrussee/caveman)',
    default: false,
  });
}
