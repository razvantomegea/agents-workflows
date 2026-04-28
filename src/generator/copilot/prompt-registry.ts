import type { StackConfig } from '../../schema/stack-config.js';
import type { CopilotPromptKey } from './prompt-tool-allowlist.js';

export interface CopilotPromptDef {
  key: CopilotPromptKey;
  configKey: keyof StackConfig['selectedCommands'];
  outputName: string;
  templateFile: string;
  description: string;
  argumentHint: string;
}

// `workflowLonghorizon` and `workflowTcr` are Claude/Codex-only by PRD scope (E11.T3);
// not emitted as Copilot prompts. Extend deliberately when those flows mature.
export const COPILOT_PROMPTS: readonly CopilotPromptDef[] = [
  {
    key: 'workflowPlan',
    configKey: 'workflowPlan',
    outputName: 'workflow-plan.prompt.md',
    templateFile: 'commands/workflow-plan.md.ejs',
    description: 'Plan and execute a feature or bug fix end-to-end.',
    argumentHint: '<feature description>',
  },
  {
    key: 'workflowFix',
    configKey: 'workflowFix',
    outputName: 'workflow-fix.prompt.md',
    templateFile: 'commands/workflow-fix.md.ejs',
    description: 'Fix verified QA issues from a QA report.',
    argumentHint: 'QA.md',
  },
  {
    key: 'externalReview',
    configKey: 'externalReview',
    outputName: 'external-review.prompt.md',
    templateFile: 'commands/external-review.md.ejs',
    description: 'Run an external review tool and write findings to QA.md.',
    argumentHint: '',
  },
];
