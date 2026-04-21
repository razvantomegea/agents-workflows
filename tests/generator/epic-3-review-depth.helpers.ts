import type { GeneratedFile } from '../../src/generator/types.js';

export const SECTION_HEADINGS = [
  '### 1. Correctness',
  '### 2. Security (OWASP Top 10 2025 baseline)',
  '### 3. Tests',
  '### 4. Design',
  '### 5. Readability / naming',
  '### 6. Observability',
  '### 7. Documentation',
  '### 8. Git hygiene',
  '### 9. AI-specific',
];

export const AI_COMPLACENCY_CONSUMERS = ['code-reviewer', 'reviewer'];

export const MODEL_ROUTING_ROLES = [
  'architect',
  'implementer',
  'code-reviewer',
  'reviewer',
  'external-review',
  'code-optimizer',
  'test-writer',
  'e2e-tester',
  'ui-designer',
];

interface GetFileContentParams {
  files: GeneratedFile[];
  filePath: string;
  label: string;
}

const getFileContent = ({ files, filePath, label }: GetFileContentParams): string => {
  const file = files.find((generatedFile: GeneratedFile) => generatedFile.path === filePath);
  if (!file) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  return file.content;
};

export const getAgentContent = (files: GeneratedFile[], agentName: string): string =>
  getFileContent({ files, filePath: `.claude/agents/${agentName}.md`, label: 'Agent file' });

export const getCommandContent = (files: GeneratedFile[], commandName: string): string =>
  getFileContent({ files, filePath: `.claude/commands/${commandName}.md`, label: 'Command file' });

export const getRootFileContent = (files: GeneratedFile[], fileName: string): string =>
  getFileContent({ files, filePath: fileName, label: 'Root file' });

export const assertStepOrder = (content: string, orderedSteps: string[]): void => {
  let previousIndex = -1;
  for (const step of orderedSteps) {
    const stepIndex = content.indexOf(step, previousIndex + 1);
    if (stepIndex === -1) {
      throw new Error(`Expected step to exist in content: "${step}"`);
    }
    previousIndex = stepIndex;
  }
};
