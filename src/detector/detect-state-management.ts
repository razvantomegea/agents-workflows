import { readPackageJson, getAllDeps } from '../utils/index.js';
import type { Detection } from './types.js';

export async function detectStateManagement(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (!pkg) return { value: null, confidence: 0 };

  const deps = getAllDeps(pkg);

  if (deps['zustand']) return { value: 'zustand', confidence: 0.9 };
  if (deps['@reduxjs/toolkit'] || deps['redux']) return { value: 'redux', confidence: 0.9 };
  if (deps['jotai']) return { value: 'jotai', confidence: 0.9 };
  if (deps['recoil']) return { value: 'recoil', confidence: 0.9 };
  if (deps['mobx']) return { value: 'mobx', confidence: 0.9 };
  if (deps['pinia']) return { value: 'pinia', confidence: 0.9 };
  if (deps['@tanstack/react-query']) return { value: 'tanstack-query', confidence: 0.8 };

  return { value: null, confidence: 0 };
}
