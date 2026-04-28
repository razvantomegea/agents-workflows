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

  interface MergeRerunCase {
    target: 'Cursor' | 'Windsurf';
    rulePath: string;
    userTail: string;
    expectedHeading: string;
    expectedSnippet: string;
  }

  const cases: readonly MergeRerunCase[] = [
    {
      target: 'Cursor',
      rulePath: '.cursor/rules/00-fail-safe.mdc',
      userTail: '\n\n## Local override\nteam-only guidance lives here.\n',
      expectedHeading: '## Local override',
      expectedSnippet: 'team-only guidance',
    },
    {
      target: 'Windsurf',
      rulePath: '.windsurf/rules/00-fail-safe.md',
      userTail: '\n\n## Cascade override\nwindsurf-team guidance.\n',
      expectedHeading: '## Cascade override',
      expectedSnippet: 'windsurf-team guidance',
    },
  ];

  it.each(cases)(
    'preserves user content past managed-end on $target rule re-run',
    async ({ rulePath, userTail, expectedHeading, expectedSnippet }: MergeRerunCase) => {
      const files = await renderAllTargets();
      const ruleFile = files.find((file: { path: string }) => file.path === rulePath);
      expect(ruleFile).toBeDefined();
      expect(ruleFile?.merge).toBeDefined();

      const fullPath = join(projectRoot, ruleFile!.path);
      await writeFileEnsuringDir(fullPath, ruleFile!.content + userTail);

      await writeGeneratedFiles(projectRoot, [ruleFile!]);

      const finalContent = await readFile(fullPath, 'utf-8');
      expect(finalContent).toContain(expectedHeading);
      expect(finalContent).toContain(expectedSnippet);
    },
  );
});
