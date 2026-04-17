import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { logger } from '../utils/index.js';
import { detectStack } from '../detector/index.js';
import { runPromptFlow } from '../prompt/index.js';
import { generateAll } from '../generator/index.js';
import { writeGeneratedFiles, backupExistingFiles, restoreBackupFiles } from '../installer/index.js';
import type { AgentsWorkflowsManifest } from '../schema/manifest.js';
import type { StackConfig } from '../schema/stack-config.js';

export interface InitCommandOptions {
  config?: StackConfig;
  yes?: boolean;
}

export async function initCommand(
  projectRoot: string,
  options: InitCommandOptions = {},
): Promise<void> {
  logger.heading('agents-workflows');
  logger.info('Detecting project stack...\n');

  const detected = await detectStack(projectRoot);

  logger.heading('Detected:');
  printDetected(detected);

  logger.blank();
  const config = options.config ?? await runPromptFlow(detected, projectRoot, { yes: options.yes });

  logger.blank();
  logger.info('Generating files...\n');

  const files = await generateAll(config);

  const backup = await backupExistingFiles(projectRoot, files);

  const manifest: AgentsWorkflowsManifest = {
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    stackConfigHash: hashConfig(JSON.stringify(config)),
    config,
    files: files.map((f) => f.path),
  };

  const manifestPath = join(projectRoot, '.agents-workflows.json');
  try {
    await writeGeneratedFiles(projectRoot, files);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (error) {
    await restoreBackupFiles(projectRoot, backup);
    throw error;
  }

  logger.blank();
  logger.success(`Done! ${files.length} files generated.`);
  logger.blank();
  logger.info('Next steps:');
  logger.info('  1. Review the generated files and customize as needed');
  logger.info('  2. Add project-specific rules to CLAUDE.md');
  logger.info('  3. Run `npx agents-workflows update` after changing .agents-workflows.json');
  logger.blank();
}

function hashConfig(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

function printDetected(detected: ReturnType<typeof import('../detector/detect-stack.js').detectStack> extends Promise<infer T> ? T : never): void {
  const entries = [
    ['Language', detected.language],
    ['Framework', detected.framework],
    ['UI Library', detected.uiLibrary],
    ['State', detected.stateManagement],
    ['Database', detected.database],
    ['Testing', detected.testFramework],
    ['E2E', detected.e2eFramework],
    ['Linter', detected.linter],
    ['Formatter', detected.formatter],
    ['Pkg Manager', detected.packageManager],
  ] as const;

  for (const [label, detection] of entries) {
    if (detection.value) {
      logger.label(label, `${detection.value} (${Math.round(detection.confidence * 100)}%)`);
    }
  }
}
