import chalk from 'chalk';

// eslint-disable-next-line no-control-regex -- reason: intentionally strips ANSI escape sequences
const ANSI_ESCAPE_RE = /[\u001b\u009b][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

/**
 * Strips ANSI escape sequences, control characters, and newlines from a string
 * before it is included in a log message. Prevents log injection via
 * manifest-derived or user-controlled values.
 */
export function sanitizeForLog(value: string): string {
  return value
    .replace(ANSI_ESCAPE_RE, '')
    // eslint-disable-next-line no-control-regex -- reason: intentionally strips control characters
    .replace(/[\x00-\x1f\x7f]/g, '');
}

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
