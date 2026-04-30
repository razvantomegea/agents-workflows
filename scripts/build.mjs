import { cp, rm, access, chmod, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = join(ROOT_DIR, 'dist');
const SOURCE_TEMPLATES_DIR = join(ROOT_DIR, 'src', 'templates');
const DIST_TEMPLATES_DIR = join(DIST_DIR, 'templates');
const SOURCE_PLUGINS_DIR = join(ROOT_DIR, 'src', 'plugins');
const DIST_PLUGINS_DIR = join(DIST_DIR, 'plugins');
const DIST_BIN = join(DIST_DIR, 'index.js');
const require = createRequire(import.meta.url);
const TSC_BIN = require.resolve('typescript/bin/tsc');

await rm(DIST_DIR, { recursive: true, force: true });

const result = spawnSync(process.execPath, [TSC_BIN, '-p', 'tsconfig.build.json'], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

await cp(SOURCE_TEMPLATES_DIR, DIST_TEMPLATES_DIR, { recursive: true });

// Copy plugin skill files — created by running pnpm fetch-plugins.
// If src/plugins/ doesn't exist yet the dist/plugins/ dir is created empty.
try {
  await cp(SOURCE_PLUGINS_DIR, DIST_PLUGINS_DIR, { recursive: true });
} catch (error) {
  if (error?.code === 'ENOENT') {
    await mkdir(DIST_PLUGINS_DIR, { recursive: true });
  } else {
    throw error;
  }
}
await chmod(DIST_BIN, 0o755);
try {
  await access(DIST_BIN, constants.X_OK);
} catch (error) {
  throw new Error(`Build verification failed: executable bit missing for DIST_BIN at ${DIST_BIN}`, {
    cause: error,
  });
}

const agentsTemplatePath = join(DIST_TEMPLATES_DIR, 'config', 'AGENTS.md.ejs');
try {
  await access(agentsTemplatePath, constants.R_OK);
} catch (error) {
  throw new Error(
    `Build verification failed: missing/unreadable template AGENTS.md.ejs under DIST_TEMPLATES_DIR at ${agentsTemplatePath}`,
    { cause: error },
  );
}
