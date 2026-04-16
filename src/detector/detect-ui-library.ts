import { readPackageJson, getAllDeps } from '../utils/index.js';
import type { Detection } from './types.js';

export async function detectUiLibrary(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (!pkg) return { value: null, confidence: 0 };

  const deps = getAllDeps(pkg);

  if (deps['tamagui'] || deps['@tamagui/core']) return { value: 'tamagui', confidence: 0.95 };
  if (deps['nativewind']) return { value: 'nativewind', confidence: 0.9 };
  if (deps['tailwindcss']) return { value: 'tailwind', confidence: 0.9 };
  if (deps['@mui/material']) return { value: 'mui', confidence: 0.9 };
  if (deps['@chakra-ui/react']) return { value: 'chakra', confidence: 0.9 };
  if (deps['@mantine/core']) return { value: 'mantine', confidence: 0.9 };
  if (deps['antd']) return { value: 'ant-design', confidence: 0.9 };
  if (deps['@radix-ui/react-dialog'] || deps['class-variance-authority']) {
    return { value: 'shadcn', confidence: 0.75 };
  }

  return { value: null, confidence: 0 };
}
