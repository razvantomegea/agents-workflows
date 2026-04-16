import { readPackageJson, getAllDeps, readPyprojectToml } from '../utils/index.js';
import type { Detection } from './types.js';

export async function detectFramework(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const deps = getAllDeps(pkg);

    if (deps['expo']) return { value: 'expo', confidence: 0.95 };
    if (deps['react-native'] && !deps['expo']) return { value: 'react-native', confidence: 0.9 };
    if (deps['next']) return { value: 'nextjs', confidence: 0.95 };
    if (deps['nuxt']) return { value: 'nuxt', confidence: 0.95 };
    if (deps['@remix-run/react']) return { value: 'remix', confidence: 0.95 };
    if (deps['@sveltejs/kit']) return { value: 'sveltekit', confidence: 0.95 };
    if (deps['@angular/core']) return { value: 'angular', confidence: 0.95 };
    if (deps['@nestjs/core']) return { value: 'nestjs', confidence: 0.95 };
    if (deps['express']) return { value: 'express', confidence: 0.8 };
    if (deps['fastify']) return { value: 'fastify', confidence: 0.85 };
    if (deps['hono']) return { value: 'hono', confidence: 0.85 };
    if (deps['react'] && !deps['next'] && !deps['expo']) {
      return { value: 'react', confidence: 0.75 };
    }
    if (deps['vue'] && !deps['nuxt']) return { value: 'vue', confidence: 0.75 };
  }

  const pyproject = await readPyprojectToml(projectRoot);
  if (pyproject?.project?.dependencies) {
    const pyDeps = pyproject.project.dependencies;
    if (pyDeps.some((d) => d.startsWith('fastapi'))) return { value: 'fastapi', confidence: 0.9 };
    if (pyDeps.some((d) => d.startsWith('django'))) return { value: 'django', confidence: 0.9 };
    if (pyDeps.some((d) => d.startsWith('flask'))) return { value: 'flask', confidence: 0.9 };
  }

  return { value: null, confidence: 0 };
}
