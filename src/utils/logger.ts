import chalk from 'chalk';

export const logger = {
  heading(text: string): void {
    console.log(chalk.bold.cyan(`\n  ${text}\n`));
  },

  info(text: string): void {
    console.log(chalk.gray(`  ${text}`));
  },

  success(text: string): void {
    console.log(chalk.green(`  ${text}`));
  },

  warn(text: string): void {
    console.log(chalk.yellow(`  ${text}`));
  },

  error(text: string): void {
    console.error(chalk.red(`  ${text}`));
  },

  file(path: string): void {
    console.log(chalk.gray(`    ${path}`));
  },

  label(label: string, value: string): void {
    console.log(`  ${chalk.gray(label.padEnd(16))} ${chalk.white(value)}`);
  },

  blank(): void {
    console.log('');
  },
};
