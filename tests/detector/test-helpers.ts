import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Create a temporary directory with a configurable prefix and register it for cleanup.
 *
 * The returned `root` is the absolute path to the temp dir. The caller is responsible
 * for pushing the `root` into a `created: string[]` array and cleaning up in `afterEach`.
 *
 * @param options.prefix - Prefix for the OS temp dir name
 * @param options.created - Mutable array to push the new dir path into (for cleanup)
 * @returns The absolute path to the created temporary directory
 */
export async function makeRoot({
  prefix,
  created,
}: {
  prefix: string;
  created: string[];
}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  created.push(root);
  return root;
}

/**
 * Create a temporary project with a package.json, run a callback against it, and remove the project directory afterward.
 *
 * Ensures the temporary directory is removed after the callback completes or throws.
 *
 * @param prefix - Prefix for the temporary directory name created in the OS temp directory
 * @param dependencies - Mapping of package names to version strings to write into the generated `package.json`
 * @param callback - Async function invoked with the path to the temporary project root
 */
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
