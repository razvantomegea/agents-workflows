import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { confirm } from '@inquirer/prompts';
import { logger, fileExists } from '../utils/index.js';
import { manifestSchema } from '../schema/manifest.js';
import { generateAll } from '../generator/index.js';
import { writeGeneratedFiles, backupExistingFiles, diffFiles } from '../installer/index.js';

export interface UpdateCommandOptions {
  yes?: boolean;
}

export async function updateCommand(
  projectRoot: string,
  options: UpdateCommandOptions = {},
): Promise<void> {
  const manifestPath = join(projectRoot, '.agents-workflows.json');

  if (!(await fileExists(manifestPath))) {
    logger.error('No .agents-workflows.json found. Run `agents-workflows init` first.');
    process.exit(1);
  }

  const raw = await readFile(manifestPath, 'utf-8');
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Invalid JSON in ${manifestPath}: ${message}`);
    process.exit(1);
  }

  const parsed = manifestSchema.safeParse(manifestJson);

  if (!parsed.success) {
    logger.error('Invalid .agents-workflows.json:');
    logger.error(parsed.error.message);
    process.exit(1);
  }

  const { config } = parsed.data;

  logger.heading('agents-workflows update');
  logger.info('Re-generating files from config...\n');

  const files = await generateAll(config);
  const diffs = await diffFiles(projectRoot, files);

  const changed = diffs.filter((d) => d.hasChanges);
  const unchanged = diffs.filter((d) => !d.hasChanges);

  if (changed.length === 0) {
    logger.success('All files are up to date. Nothing to change.');
    return;
  }

  logger.info(`${changed.length} file(s) changed, ${unchanged.length} unchanged.\n`);

  for (const diff of changed) {
    if (diff.isNew) {
      logger.success(`  + ${diff.path} (new)`);
    } else {
      logger.warn(`  ~ ${diff.path} (modified)`);
      if (diff.patch) {
        console.log(diff.patch);
      }
    }
  }

  logger.blank();
  const proceed = options.yes || await confirm({ message: 'Apply changes?', default: true });

  if (!proceed) {
    logger.info('Aborted.');
    return;
  }

  const changedFiles = files.filter((f) =>
    changed.some((d) => d.path === f.path),
  );

  await backupExistingFiles(projectRoot, changedFiles);
  await writeGeneratedFiles(projectRoot, changedFiles);

  logger.success(`Updated ${changedFiles.length} file(s).`);
}
