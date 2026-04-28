import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { writeGeneratedFiles } from '../../src/installer/write-files.js';
import { renderAllTargets } from '../helpers/render-all-targets.js';
import { resetWriteSession, configureWriteSession } from '../../src/generator/index.js';

async function writeFileEnsuringDir(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
}

describe('target re-run merge preservation', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'epic-11-rerun-'));
    resetWriteSession();
    configureWriteSession({ override: 'merge' });
  });

  afterEach(async () => {
    resetWriteSession();
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('preserves user content past managed-end on Cursor rule re-run', async () => {
    const files = await renderAllTargets();
    const ruleFile = files.find((f) => f.path === '.cursor/rules/00-fail-safe.mdc');
    expect(ruleFile).toBeDefined();
    expect(ruleFile?.merge).toBeDefined();

    const fullPath = join(projectRoot, ruleFile!.path);
    const userTail = '\n\n## Local override\nteam-only guidance lives here.\n';
    await writeFileEnsuringDir(fullPath, ruleFile!.content + userTail);

    await writeGeneratedFiles(projectRoot, [ruleFile!]);

    const finalContent = await readFile(fullPath, 'utf-8');
    expect(finalContent).toContain('## Local override');
    expect(finalContent).toContain('team-only guidance');
  });

  it('preserves user content past managed-end on Windsurf rule re-run', async () => {
    const files = await renderAllTargets();
    const ruleFile = files.find((f) => f.path === '.windsurf/rules/00-fail-safe.md');
    expect(ruleFile).toBeDefined();
    expect(ruleFile?.merge).toBeDefined();

    const fullPath = join(projectRoot, ruleFile!.path);
    const userTail = '\n\n## Cascade override\nwindsurf-team guidance.\n';
    await writeFileEnsuringDir(fullPath, ruleFile!.content + userTail);

    await writeGeneratedFiles(projectRoot, [ruleFile!]);

    const finalContent = await readFile(fullPath, 'utf-8');
    expect(finalContent).toContain('## Cascade override');
    expect(finalContent).toContain('windsurf-team guidance');
  });
});
