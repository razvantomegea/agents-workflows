import { checkbox } from '@inquirer/prompts';

const COMMAND_CHOICES = [
  { name: '/workflow-plan — End-to-end feature workflow', value: 'workflowPlan', checked: true },
  { name: '/workflow-fix — Fix QA issues', value: 'workflowFix', checked: true },
  { name: '/external-review — External review tool integration', value: 'externalReview', checked: false },
  { name: '/workflow-longhorizon - Multi-session long-horizon harness', value: 'workflowLonghorizon', checked: false },
  { name: '/workflow-tcr — TCR (test && commit || revert)', value: 'workflowTcr', checked: false },
] as const;

/** Prompt the user to choose which CLI command workflows to generate. */
export async function askCommandSelection(): Promise<string[]> {
  return checkbox({ message: 'Select commands to generate:', choices: [...COMMAND_CHOICES] });
}
