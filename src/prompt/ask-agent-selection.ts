import { checkbox } from '@inquirer/prompts';

/**
 * Prompt the user to select which agents to generate.
 * The `ui-designer` choice is hidden (not merely unchecked) for non-frontend stacks.
 *
 * @param params.isFrontend - Whether the project uses a frontend framework.
 * @returns An array of selected agent value strings.
 */
export async function askAgentSelection(
  params: Readonly<{ isFrontend: boolean }>,
): Promise<string[]> {
  const { isFrontend } = params;
  const choices = [
    { name: 'architect — Planning agent (Opus)', value: 'architect', checked: true },
    { name: 'implementer — Primary implementation agent', value: 'implementer', checked: true },
    { name: 'code-reviewer — Post-edit review with checklist', value: 'codeReviewer', checked: true },
    { name: 'security-reviewer — OWASP/security audit (parallel to code-reviewer)', value: 'securityReviewer', checked: true },
    { name: 'code-optimizer — Performance & quality analysis', value: 'codeOptimizer', checked: true },
    { name: 'test-writer — Unit test generation', value: 'testWriter', checked: true },
    { name: 'e2e-tester — E2E test generation', value: 'e2eTester', checked: false },
    { name: 'reviewer — Review loop orchestrator', value: 'reviewer', checked: true },
    ...(isFrontend
      ? [{ name: 'ui-designer — UI/UX design system enforcement', value: 'uiDesigner', checked: true }]
      : []),
  ];

  return checkbox({ message: 'Select agents to generate:', choices });
}
