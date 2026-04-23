import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { confirm } from '@inquirer/prompts';
import { logger, fileExists } from '../utils/index.js';
import { manifestSchema } from '../schema/manifest.js';
import { generateAll, writeFileSafe } from '../generator/index.js';
import { withSafetySession } from './safety-session.js';
import { parseSafetyFlags } from './safety-flags.js';
import { writeGeneratedFiles, backupExistingFiles, diffFiles } from '../installer/index.js';
import { askMainBranch } from '../prompt/questions.js';
import type { AgentsWorkflowsManifest } from '../schema/manifest.js';
import type { MergeStrategy } from '../generator/index.js';

export interface UpdateCommandOptions {
  yes?: boolean;
  noPrompt?: boolean;
  mergeStrategy?: MergeStrategy;
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

  const nonInteractive = options.yes || options.noPrompt;
  const config = {
    ...parsed.data.config,
    project: {
      ...parsed.data.config.project,
      mainBranch: nonInteractive
        ? parsed.data.config.project.mainBranch
        : await askMainBranch(parsed.data.config.project.mainBranch),
    },
  };

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
  const proceed = nonInteractive || await confirm({ message: 'Apply changes?', default: true });

  if (!proceed) {
    logger.info('Aborted.');
    return;
  }

  const changedFiles = files.filter((f) =>
    changed.some((d) => d.path === f.path),
  );

  const safetyFlags = parseSafetyFlags({
    yes: options.yes,
    noPrompt: options.noPrompt,
    mergeStrategy: options.mergeStrategy,
  });

  await withSafetySession(safetyFlags, async () => {
    await backupExistingFiles(projectRoot, changedFiles);
    const writeResult = await writeGeneratedFiles(projectRoot, changedFiles);
    const nextManifest: AgentsWorkflowsManifest = {
      ...parsed.data,
      generatedAt: new Date().toISOString(),
      stackConfigHash: hashConfig(JSON.stringify(config)),
      config,
      files: files.map((file) => file.path),
    };
    await writeFileSafe({
      path: manifestPath,
      content: JSON.stringify(nextManifest, null, 2),
      displayPath: '.agents-workflows.json',
    });

    logger.success(`Updated ${writeResult.writtenPaths.length} file(s).`);
    if (writeResult.skippedPaths.length > 0) {
      logger.warn(`${writeResult.skippedPaths.length} existing Markdown file(s) were left unchanged.`);
    }
  });
}

function hashConfig(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}
