import { readPackageJson, getAllDeps, readPyprojectToml } from '../utils/index.js';
import type { Detection } from './types.js';

export async function detectDatabase(projectRoot: string): Promise<Detection> {
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const deps = getAllDeps(pkg);

    if (deps['@supabase/supabase-js']) return { value: 'supabase', confidence: 0.95 };
    if (deps['prisma'] || deps['@prisma/client']) return { value: 'prisma', confidence: 0.95 };
    if (deps['drizzle-orm']) return { value: 'drizzle', confidence: 0.95 };
    if (deps['firebase'] || deps['firebase-admin']) return { value: 'firebase', confidence: 0.9 };
    if (deps['mongoose']) return { value: 'mongoose', confidence: 0.9 };
    if (deps['typeorm']) return { value: 'typeorm', confidence: 0.9 };
    if (deps['knex']) return { value: 'knex', confidence: 0.85 };
    if (deps['sequelize']) return { value: 'sequelize', confidence: 0.85 };
  }

  const pyproject = await readPyprojectToml(projectRoot);
  if (pyproject?.project?.dependencies) {
    const pyDeps = pyproject.project.dependencies;
    if (pyDeps.some((d) => d.startsWith('sqlalchemy'))) return { value: 'sqlalchemy', confidence: 0.9 };
    if (pyDeps.some((d) => d.startsWith('django'))) return { value: 'django-orm', confidence: 0.8 };
    if (pyDeps.some((d) => d.startsWith('tortoise'))) return { value: 'tortoise-orm', confidence: 0.9 };
  }

  return { value: null, confidence: 0 };
}
