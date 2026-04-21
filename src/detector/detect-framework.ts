import { readPackageJson, getAllDeps, readPyprojectToml } from '../utils/index.js';
import { BACKEND_FRAMEWORKS } from '../constants/frameworks.js';
import type { Detection } from './types.js';

const PACKAGE_JSON_BACKEND_CONFIDENCE: Record<(typeof BACKEND_FRAMEWORKS)[number], number> = {
  express: 0.8,
  fastify: 0.85,
  hono: 0.85,
  nestjs: 0.95,
  fastapi: 0.9,
  django: 0.9,
  flask: 0.9,
};

const PACKAGE_JSON_BACKEND_DETECTION_ORDER: ReadonlyArray<(typeof BACKEND_FRAMEWORKS)[number]> = [
  'nestjs',
  ...BACKEND_FRAMEWORKS.filter(
    (framework: (typeof BACKEND_FRAMEWORKS)[number]): boolean => framework !== 'nestjs',
  ),
];

const PYPROJECT_BACKEND_PREFIXES: Partial<Record<(typeof BACKEND_FRAMEWORKS)[number], string>> = {
  fastapi: 'fastapi',
  django: 'django',
  flask: 'flask',
};

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
    const packageFrameworkDependencyMap: Partial<Record<(typeof BACKEND_FRAMEWORKS)[number], string>> = {
      nestjs: '@nestjs/core',
      express: 'express',
      fastify: 'fastify',
      hono: 'hono',
    };
    for (const framework of PACKAGE_JSON_BACKEND_DETECTION_ORDER) {
      const dependencyName = packageFrameworkDependencyMap[framework];
      if (dependencyName !== undefined && deps[dependencyName]) {
        return { value: framework, confidence: PACKAGE_JSON_BACKEND_CONFIDENCE[framework] };
      }
    }
    if (deps['react'] && !deps['next'] && !deps['expo']) {
      return { value: 'react', confidence: 0.75 };
    }
    if (deps['vue'] && !deps['nuxt']) return { value: 'vue', confidence: 0.75 };
  }

  const pyproject = await readPyprojectToml(projectRoot);
  if (pyproject?.project?.dependencies) {
    const pyDeps = pyproject.project.dependencies;
    for (const framework of BACKEND_FRAMEWORKS) {
      const dependencyPrefix = PYPROJECT_BACKEND_PREFIXES[framework];
      if (dependencyPrefix !== undefined && pyDeps.some((dependency: string) => dependency.startsWith(dependencyPrefix))) {
        return { value: framework, confidence: PACKAGE_JSON_BACKEND_CONFIDENCE[framework] };
      }
    }
  }

  return { value: null, confidence: 0 };
}
