// Backward-compatibility barrel — all exports live in monorepo-readers/index.ts.
export { readCargoWorkspace, readUvWorkspace, readPoetryWorkspace } from './monorepo-readers/toml-readers.js';
export { readGoWork, readDotnetSolution, readCmakeSubdirs } from './monorepo-readers/native-readers.js';
