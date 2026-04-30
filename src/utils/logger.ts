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

/**
 * Structured CLI output logger.
 *
 * All methods write to **stdout** via `console.log` except `error`, which
 * writes to **stderr** via `console.error`. Every message is indented by two
 * spaces (four for `file`) so output aligns under CLI command headings.
 *
 * @remarks All methods produce side effects (writes to stdout or stderr).
 *   No method throws.
 */
export const logger = {
  /**
   * Prints a bold cyan section heading surrounded by blank lines to **stdout**.
   *
   * @param text - Heading text to display.
   */
  heading(text: string): void {
    console.log(chalk.bold.cyan(`\n  ${text}\n`));
  },

  /**
   * Prints an informational gray message to **stdout**.
   *
   * @param text - Message text.
   */
  info(text: string): void {
    console.log(chalk.gray(`  ${text}`));
  },

  /**
   * Prints a green success message to **stdout**.
   *
   * @param text - Message text.
   */
  success(text: string): void {
    console.log(chalk.green(`  ${text}`));
  },

  /**
   * Prints a yellow warning message to **stdout**.
   *
   * @param text - Warning message text.
   */
  warn(text: string): void {
    console.log(chalk.yellow(`  ${text}`));
  },

  /**
   * Prints a red error message to **stderr**.
   *
   * @param text - Error message text.
   * @remarks This is the only logger method that writes to **stderr**
   *   (`console.error`). All other methods use **stdout**.
   */
  error(text: string): void {
    console.error(chalk.red(`  ${text}`));
  },

  /**
   * Prints a file path indented under an active section to **stdout**.
   *
   * @param path - File path to display (four-space indent).
   */
  file(path: string): void {
    console.log(chalk.gray(`    ${path}`));
  },

  /**
   * Prints a key-value pair with the label left-padded to 16 characters to **stdout**.
   *
   * @param label - Left-hand label text, padded to 16 characters.
   * @param value - Right-hand value text displayed in white.
   */
  label(label: string, value: string): void {
    console.log(`  ${chalk.gray(label.padEnd(16))} ${chalk.white(value)}`);
  },

  /**
   * Prints a blank line to **stdout**.
   */
  blank(): void {
    console.log('');
  },
};
