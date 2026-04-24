import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function withPackageJson({
  prefix,
  dependencies,
  callback,
}: {
  prefix: string;
  dependencies: Record<string, string>;
  callback: (projectRoot: string) => Promise<void>;
}): Promise<void> {
  const projectRoot = await mkdtemp(join(tmpdir(), prefix));
  try {
    await writeFile(
      join(projectRoot, 'package.json'),
      JSON.stringify({ dependencies }, null, 2),
      'utf-8',
    );
    await callback(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}
