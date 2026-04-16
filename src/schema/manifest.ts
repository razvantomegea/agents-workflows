import { z } from 'zod';
import { stackConfigSchema } from './stack-config.js';

export const manifestSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  stackConfigHash: z.string(),
  config: stackConfigSchema,
  files: z.array(z.string()),
});

export type AgentsWorkflowsManifest = z.infer<typeof manifestSchema>;
