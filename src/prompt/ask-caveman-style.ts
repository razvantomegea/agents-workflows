import { confirm } from '@inquirer/prompts';

export async function askCavemanStyle(): Promise<boolean> {
  return confirm({
    message: 'Apply caveman style? (compresses all generated .md files ~65-75%, see https://github.com/juliusbrussee/caveman)',
    default: false,
  });
}
