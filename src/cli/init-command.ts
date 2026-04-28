import { join, resolve } from 'node:path';
import { logger, sanitizeForLog } from '../utils/index.js';
import { detectStack } from '../detector/index.js';
import { runPromptFlow } from '../prompt/index.js';
import { askInstallScope, type InstallScope } from '../prompt/install-scope.js';
import { generateAll, writeFileSafe } from '../generator/index.js';
import { withSafetySession } from './safety-session.js';
import { parseSafetyFlags } from './safety-flags.js';
import { writeGeneratedFiles, backupExistingFiles, restoreBackupFiles } from '../installer/index.js';
import { printDetected } from './print-detected.js';
import { printDetectedAiTools } from './print-detected-ai-tools.js';
import { buildWorkspaceStacks } from './build-workspace-stacks.js';
import { filterDetectedByWorkspacePaths } from './filter-detected-by-paths.js';
import type { AgentsWorkflowsManifest } from '../schema/manifest.js';
import type { StackConfig, IsolationChoice } from '../schema/stack-config.js';
import type { DetectedStack } from '../detector/types.js';
import type { MergeStrategy } from '../generator/index.js';
import { parseNonInteractiveFlags } from './non-interactive-flags.js';
import { hashConfig } from './hash-config.js';
import { resolveWorkspaceSelection } from '../prompt/resolve-workspace-selection.js';

export interface InitCommandOptions {
  config?: StackConfig;
  yes?: boolean;
  noPrompt?: boolean;
  mergeStrategy?: MergeStrategy;
  nonInteractive?: boolean;
  isolation?: IsolationChoice;
  acceptRisks?: boolean;
}

export async function initCommand(
  projectRoot: string,
  options: InitCommandOptions = {},
): Promise<void> {
  // Validate non-interactive flags early; NonInteractiveFlagsError propagates to handleSafetyErrors → exit 1.
  const nonInteractiveFlags = parseNonInteractiveFlags({
    nonInteractive: options.nonInteractive,
    isolation: options.isolation,
    acceptRisks: options.acceptRisks,
  });

  logger.heading('agents-workflows');
  logger.info('Detecting project stack...\n');

  const detected = await detectStack(projectRoot);

  logger.heading('Detected:');
  printDetected(detected);
  printDetectedAiTools(detected.aiAgents.agents);

  const resolvedOptions: InitCommandOptions = {
    yes: options.yes,
    noPrompt: options.noPrompt,
    mergeStrategy: options.mergeStrategy,
    config: options.config,
    nonInteractive: nonInteractiveFlags.enabled,
    isolation: nonInteractiveFlags.isolation ?? undefined,
    acceptRisks: nonInteractiveFlags.acceptedHostOsRisk,
  };

  const selectedPaths = await resolveWorkspaceSelection({
    detected,
    yes: options.yes ?? false,
    noPrompt: options.noPrompt ?? false,
  });
  const filteredDetected = filterDetectedByWorkspacePaths(detected, selectedPaths);
  const scope = await resolveInstallScope(filteredDetected, resolvedOptions);

  if (scope === 'root') {
    await installSinglePackage({
      projectRoot,
      detected: filteredDetected,
      options: resolvedOptions,
      monorepoOverride: rootMonorepoConfig(filteredDetected),
    });
    return;
  }

  if (scope === 'both') {
    await installSinglePackage({
      projectRoot,
      detected: filteredDetected,
      options: resolvedOptions,
      monorepoOverride: rootMonorepoConfig(filteredDetected),
    });
  }

  await installWorkspaces(projectRoot, filteredDetected, resolvedOptions);
}

async function resolveInstallScope(
  detected: DetectedStack,
  options: InitCommandOptions,
): Promise<InstallScope> {
  if (options.config || options.yes || options.noPrompt) return 'root';
  logger.blank();
  return askInstallScope(detected.monorepo);
}

function rootMonorepoConfig(detected: DetectedStack): StackConfig['monorepo'] {
  if (!detected.monorepo.isMonorepo) return null;
  return {
    isRoot: true,
    tool: detected.monorepo.tool,
    workspaces: buildWorkspaceStacks(detected),
  };
}

async function installWorkspaces(
  rootDir: string,
  detected: DetectedStack,
  options: InitCommandOptions,
): Promise<void> {
  for (const workspaceStack of detected.workspaceStacks) {
    const workspacePath = join(rootDir, workspaceStack.path);
    logger.blank();
    logger.heading(`Workspace: ${sanitizeForLog(workspaceStack.path)}`);
    // Full detectStack per workspace: runPromptFlow needs fields (testLibrary, i18n, aiAgents) not in WorkspaceStackDetection.
    const workspaceDetected = await detectStack(workspacePath);
    printDetected(workspaceDetected);
    await installSinglePackage({
      projectRoot: workspacePath,
      detected: workspaceDetected,
      options,
      monorepoOverride: null,
    });
  }
}

interface InstallSinglePackageParams {
  projectRoot: string;
  detected: DetectedStack;
  options: InitCommandOptions;
  monorepoOverride: StackConfig['monorepo'];
}

async function installSinglePackage({
  projectRoot,
  detected,
  options,
  monorepoOverride,
}: InstallSinglePackageParams): Promise<void> {
  logger.blank();
  const baseConfig = options.config ?? await runPromptFlow(detected, projectRoot, {
    yes: options.yes,
    nonInteractive: options.nonInteractive,
    isolation: options.isolation,
    acceptRisks: options.acceptRisks,
  });
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
  const safetyFlags = parseSafetyFlags({
    yes: options.yes,
    noPrompt: options.noPrompt,
    mergeStrategy: options.mergeStrategy,
  });

  try {
    await withSafetySession(safetyFlags, async () => {
      logger.info('Writing files:');
      const writeResult = await writeGeneratedFiles(projectRoot, files);
      await writeFileSafe({
        path: manifestPath,
        content: JSON.stringify(manifest, null, 2),
        displayPath: '.agents-workflows.json',
      });
      if (writeResult.skippedPaths.length > 0) {
        logger.warn(`${writeResult.skippedPaths.length} existing Markdown file(s) were left unchanged.`);
      }
    });
  } catch (error) {
    await restoreBackupFiles(projectRoot, backup);
    throw error;
  }

  logger.blank();
  logger.success(`Done! ${files.length} files processed at ${resolve(projectRoot)}`);
  logger.blank();
  logger.info('Next steps:');
  logger.info('  1. Review the generated files and customize as needed');
  logger.info('  2. Add project-specific rules to CLAUDE.md');
  logger.info('  3. Run `npx agents-workflows update` after changing .agents-workflows.json');
  logger.blank();
}
