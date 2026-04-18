import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { logger } from '../utils/index.js';
import { detectStack } from '../detector/index.js';
import { runPromptFlow } from '../prompt/index.js';
import { askInstallScope, type InstallScope } from '../prompt/install-scope.js';
import { generateAll } from '../generator/index.js';
import { writeGeneratedFiles, backupExistingFiles, restoreBackupFiles } from '../installer/index.js';
import type { AgentsWorkflowsManifest } from '../schema/manifest.js';
import type { StackConfig } from '../schema/stack-config.js';
import type { DetectedAiAgent, DetectedStack } from '../detector/types.js';

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
  printDetectedAiTools(detected.aiAgents.agents);

  const scope = await resolveInstallScope(detected, options);

  if (scope === 'root') {
    await installSinglePackage(projectRoot, detected, options, rootMonorepoConfig(detected));
    return;
  }

  if (scope === 'both') {
    await installSinglePackage(projectRoot, detected, options, rootMonorepoConfig(detected));
  }

  await installWorkspaces(projectRoot, detected, options);
}

async function resolveInstallScope(
  detected: DetectedStack,
  options: InitCommandOptions,
): Promise<InstallScope> {
  if (options.config || options.yes) return 'root';
  logger.blank();
  return askInstallScope(detected.monorepo);
}

function rootMonorepoConfig(detected: DetectedStack): StackConfig['monorepo'] {
  if (!detected.monorepo.isMonorepo) return null;
  return {
    isRoot: true,
    tool: detected.monorepo.tool,
    workspaces: detected.monorepo.workspaces,
  };
}

async function installWorkspaces(
  rootDir: string,
  detected: DetectedStack,
  options: InitCommandOptions,
): Promise<void> {
  for (const workspace of detected.monorepo.workspaces) {
    const workspacePath = join(rootDir, workspace);
    logger.blank();
    logger.heading(`Workspace: ${workspace}`);
    const workspaceDetected = await detectStack(workspacePath);
    printDetected(workspaceDetected);
    await installSinglePackage(workspacePath, workspaceDetected, options, null);
  }
}

async function installSinglePackage(
  projectRoot: string,
  detected: DetectedStack,
  options: InitCommandOptions,
  monorepoOverride: StackConfig['monorepo'],
): Promise<void> {
  logger.blank();
  const baseConfig = options.config ?? await runPromptFlow(detected, projectRoot, { yes: options.yes });
  const config: StackConfig = { ...baseConfig, monorepo: monorepoOverride ?? baseConfig.monorepo };

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
    logger.info('Writing files:');
    await writeGeneratedFiles(projectRoot, files);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (error) {
    await restoreBackupFiles(projectRoot, backup);
    throw error;
  }

  logger.blank();
  logger.success(`Done! ${files.length} files generated at ${resolve(projectRoot)}`);
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

function printDetected(detected: DetectedStack): void {
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
    ['Docs', detected.docsFile],
  ] as const;

  for (const [label, detection] of entries) {
    if (detection.value) {
      logger.label(label, `${detection.value} (${Math.round(detection.confidence * 100)}%)`);
    }
  }

  if (detected.monorepo.isMonorepo) {
    logger.label('Monorepo', `${detected.monorepo.tool ?? 'unknown'} (${detected.monorepo.workspaces.length} workspace(s))`);
  }
}

function printDetectedAiTools(agents: readonly DetectedAiAgent[]): void {
  const names = agents
    .filter((agent) => agent.cliAvailable)
    .map((agent) => agent.name);

  if (names.length > 0) {
    logger.info(`Detected AI tools on PATH: ${names.join(', ')}`);
  }
}
