import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { confirm } from '@inquirer/prompts';
import { logger, fileExists } from '../utils/index.js';
import { manifestSchema } from '../schema/manifest.js';
import { generateAll, writeFileSafe } from '../generator/index.js';
import { withSafetySession } from './safety-session.js';
import { parseSafetyFlags } from './safety-flags.js';
import { writeGeneratedFiles, backupExistingFiles, diffFiles, safeDeleteStaleFiles, STALE_IMPLEMENTER_VARIANT_FILES } from '../installer/index.js';
import { resolveSecurityUpdate } from './resolve-security-update.js';
import { resolveUpdateProjectConfig } from './resolve-update-project-config.js';
import { hashConfig } from './hash-config.js';
import type { AgentsWorkflowsManifest } from '../schema/manifest.js';
import type { MergeStrategy } from '../generator/index.js';
import type { IsolationChoice, StackConfig } from '../schema/stack-config.js';

export { resolveUpdateProjectConfig };

export interface UpdateCommandOptions {
  yes?: boolean;
  noPrompt?: boolean;
  mergeStrategy?: MergeStrategy;
  nonInteractive?: boolean;
  isolation?: IsolationChoice;
  acceptRisks?: boolean;
  refinePrompt?: boolean;
}

/**
 * Re-generates agent files from the existing `.agents-workflows.json` manifest and applies changes.
 *
 * @param projectRoot - Absolute path to the project root that contains `.agents-workflows.json`.
 * @param options - Optional run modifiers.
 * @param options.yes - When `true`, overwrites every changed file without a confirmation prompt (`--yes`).
 * @param options.noPrompt - When `true`, keeps existing files and only writes new ones (`--no-prompt`).
 * @param options.mergeStrategy - Default per-file conflict strategy (`keep | overwrite | merge`).
 * @param options.nonInteractive - Enables headless/CI mode; requires `isolation`.
 * @param options.isolation - Isolation environment for non-interactive mode.
 * @param options.acceptRisks - Required when `isolation === 'host-os'` in non-interactive mode.
 * @param options.refinePrompt - When `true` (default), prints the post-update `AGENTS_REFINE.md` guidance.
 *
 * @returns Resolves when all changed files have been written, or immediately when nothing has changed.
 *
 * @throws Re-throws unexpected errors after the write session completes.
 *
 * @remarks
 * Exit-code: process.exit(1) when manifest absent, invalid JSON, or fails schema.
 * Side effects: writes changed files, .agents-workflows.json manifest, optionally
 *   AGENTS_REFINE.md, and deletes stale STALE_IMPLEMENTER_VARIANT_FILES.
 * --yes/--no-prompt/--non-interactive: prompts suppressed, diffs applied immediately.
 * Otherwise: shows diff summary and asks "Apply changes?" before writing.
 */
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

  const promptsSuppressed = Boolean(options.yes || options.noPrompt || options.nonInteractive);

  const securityResolved = await resolveSecurityUpdate({
    existing: parsed.data.config.security,
    yes: options.yes,
    noPrompt: options.noPrompt,
    nonInteractive: options.nonInteractive,
    isolation: options.isolation,
    acceptRisks: options.acceptRisks,
  });

  const project = await resolveUpdateProjectConfig({
    existing: parsed.data.config.project,
    promptsSuppressed,
  });

  const config: StackConfig = {
    ...parsed.data.config,
    project,
    security: securityResolved,
  };

  logger.heading('agents-workflows update');
  logger.info('Re-generating files from config...\n');

  const files = await generateAll(config, { refinePrompt: options.refinePrompt });
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
        logger.info(diff.patch);
      }
    }
  }

  logger.blank();
  const proceed = promptsSuppressed || await confirm({ message: 'Apply changes?', default: true });

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
    mergeStrategy: resolveMergeStrategyForUpdate(options),
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
    await safeDeleteStaleFiles({
      projectRoot,
      candidates: STALE_IMPLEMENTER_VARIANT_FILES,
      suppressed: promptsSuppressed,
    });

    logger.success(`Updated ${writeResult.writtenPaths.length} file(s).`);
    if (writeResult.skippedPaths.length > 0) {
      logger.warn(
        `${writeResult.skippedPaths.length} existing file(s) were left unchanged: ${writeResult.skippedPaths.join(', ')}`,
      );
    }
    if (options.refinePrompt !== false) {
      logger.blank();
      logger.info('next:');
      logger.info('  Hand AGENTS_REFINE.md to your agent to tailor the generated agent files to this workspace.');
    }
  });
}

/**
 * In `--non-interactive` mode without an explicit `--yes`/`--no-prompt`/`--merge-strategy`
 * choice, default the per-file write strategy to `merge` so the inner `withSafetySession`
 * loop never blocks on the interactive overwrite/merge/skip prompt. `merge` is the safest
 * non-destructive default — it preserves user-tail content past the managed sentinel and
 * only overwrites the managed block.
 */
export function resolveMergeStrategyForUpdate(options: UpdateCommandOptions): MergeStrategy | undefined {
  if (options.mergeStrategy !== undefined) return options.mergeStrategy;
  if (options.nonInteractive && !options.yes && !options.noPrompt) return 'merge';
  return undefined;
}
