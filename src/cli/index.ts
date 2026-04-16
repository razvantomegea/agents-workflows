import { Command } from 'commander';
import { initCommand } from './init-command.js';
import { updateCommand } from './update-command.js';
import { listCommand } from './list-command.js';

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
    .action(async (options: { dir: string }) => {
      await initCommand(options.dir);
    });

  program
    .command('update')
    .description('Re-generate agent configurations from .agents-workflows.json')
    .option('-d, --dir <path>', 'Project root directory', process.cwd())
    .action(async (options: { dir: string }) => {
      await updateCommand(options.dir);
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
