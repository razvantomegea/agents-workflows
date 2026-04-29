import { askMainBranch, askProjectDocumentationFiles } from '../prompt/index.js';
import type { StackConfig } from '../schema/stack-config.js';

export async function resolveUpdateProjectConfig(
  params: Readonly<{
    existing: StackConfig['project'];
    promptsSuppressed: boolean;
  }>,
): Promise<StackConfig['project']> {
  if (params.promptsSuppressed) {
    return params.existing;
  }

  const projectDocumentation = await askProjectDocumentationFiles({
    docsFile: params.existing.docsFile,
    roadmapFile: params.existing.roadmapFile,
  });
  const mainBranch = await askMainBranch(params.existing.mainBranch);

  return {
    ...params.existing,
    ...projectDocumentation,
    mainBranch,
  };
}
