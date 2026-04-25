import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command, Option } from 'commander';
import { initCommand } from './init-command.js';
import { updateCommand } from './update-command.js';
import { listCommand } from './list-command.js';
import { stackConfigSchema, ISOLATION_CHOICES, type StackConfig } from '../schema/stack-config.js';
import { handleSafetyErrors } from './safety-flags.js';
import type { MergeStrategy } from '../generator/index.js';
import type { IsolationChoice } from '../schema/stack-config.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('agents-workflows')
    .description('Reusable AI agent configuration framework')
    .version('0.1.0');

  program
    .command('init')
    .description('Detect your project stack and generate agent configurations')
    .option('-d, --dir <path>', 'Project root directory', process.cwd())
    .option('-c, --config <path>', 'Path to a StackConfig JSON file for non-interactive init')
    .option('-y, --yes', 'Non-interactive: overwrite every existing file', false)
    .option('--no-prompt', 'Non-interactive: keep every existing file, create new ones only')
    .addOption(
      new Option('--merge-strategy <strategy>', 'Default action for conflicts (keep, overwrite, merge)')
        .choices(['keep', 'overwrite', 'merge']),
    )
    .option('--non-interactive', 'Enable non-interactive (headless) mode — requires --isolation')
    .addOption(
      new Option('--isolation <env>', 'Isolation environment for non-interactive mode')
        .choices([...ISOLATION_CHOICES]),
    )
    .option('--accept-risks', 'Accept host-OS risks when --isolation=host-os is used')
    .action(async (options: {
      dir: string;
      config?: string;
      yes: boolean;
      prompt: boolean;
      mergeStrategy?: MergeStrategy;
      nonInteractive?: boolean;
      isolation?: IsolationChoice;
      acceptRisks?: boolean;
    }) => {
      await handleSafetyErrors(async () => {
        await initCommand(options.dir, {
          config: options.config ? await readConfigFile(options.config, options.dir) : undefined,
          yes: options.yes,
          noPrompt: !options.prompt,
          mergeStrategy: options.mergeStrategy,
          nonInteractive: options.nonInteractive,
          isolation: options.isolation,
          acceptRisks: options.acceptRisks,
        });
      });
    });

  program
    .command('update')
    .description('Re-generate agent configurations from .agents-workflows.json')
    .option('-d, --dir <path>', 'Project root directory', process.cwd())
    .option('-y, --yes', 'Non-interactive: overwrite every existing file', false)
    .option('--no-prompt', 'Non-interactive: keep every existing file, create new ones only')
    .addOption(
      new Option('--merge-strategy <strategy>', 'Default action for conflicts (keep, overwrite, merge)')
        .choices(['keep', 'overwrite', 'merge']),
    )
    .option('--non-interactive', 'Enable non-interactive (headless) mode — requires --isolation')
    .addOption(
      new Option('--isolation <env>', 'Isolation environment for non-interactive mode')
        .choices([...ISOLATION_CHOICES]),
    )
    .option('--accept-risks', 'Accept host-OS risks when --isolation=host-os is used')
    .action(async (options: {
      dir: string;
      yes: boolean;
      prompt: boolean;
      mergeStrategy?: MergeStrategy;
      nonInteractive?: boolean;
      isolation?: IsolationChoice;
      acceptRisks?: boolean;
    }) => {
      await handleSafetyErrors(async () => {
        await updateCommand(options.dir, {
          yes: options.yes,
          noPrompt: !options.prompt,
          mergeStrategy: options.mergeStrategy,
          nonInteractive: options.nonInteractive,
          isolation: options.isolation,
          acceptRisks: options.acceptRisks,
        });
      });
    });

  program
    .command('list')
    .description('List available agents and commands')
    .option('-d, --dir <path>', 'Project root directory', process.cwd())
    .action(async (options: { dir: string }) => {
      await listCommand(options.dir);
    });

  return program;
}

async function readConfigFile(configPath: string, projectRoot: string): Promise<StackConfig> {
  const fullPath = resolve(projectRoot, configPath);
  const raw = await readFile(fullPath, 'utf-8');
  let config: unknown;

  try {
    config = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in config file ${fullPath}: ${message}`);
  }

  const parsed = stackConfigSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid config file ${fullPath}: ${parsed.error.message}`);
  }

  return parsed.data;
}
