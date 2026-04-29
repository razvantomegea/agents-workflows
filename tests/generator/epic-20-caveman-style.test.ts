import type { GeneratedFile } from '../../src/generator/types.js';
import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';

const FILLER_PHRASES = [
  'please note that',
  'it is important that',
  'make sure to',
  'note that',
  'keep in mind that',
  'of course',
  'feel free to',
];

function hasFiller(content: string): boolean {
  const lower = content.toLowerCase();
  return FILLER_PHRASES.some((phrase) => lower.includes(phrase));
}

describe('Epic 20 — caveman style post-processor', () => {
  describe('when cavemanStyle: true', () => {
    let files: GeneratedFile[];

    beforeAll(async () => {
      files = await generateAll(makeStackConfig({ cavemanStyle: true }));
    });

    it('strips filler from every generated .md file', () => {
      const mdFiles = files.filter((generatedFile) => generatedFile.path.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);

      const withFiller = mdFiles.filter((generatedFile) => hasFiller(generatedFile.content));
      expect(withFiller.map((generatedFile) => generatedFile.path)).toEqual([]);
    });

    it('does not modify non-.md files', () => {
      const config = makeStackConfig({ cavemanStyle: false });
      return generateAll(config).then((baseline) => {
        const nonMd = files.filter((generatedFile) => !generatedFile.path.endsWith('.md'));
        const baselineNonMd = baseline.filter((baselineFile) => !baselineFile.path.endsWith('.md'));
        expect(nonMd.map((generatedFile) => generatedFile.path).sort()).toEqual(
          baselineNonMd.map((baselineFile) => baselineFile.path).sort(),
        );
        for (const file of nonMd) {
          const base = baseline.find((baselineFile) => baselineFile.path === file.path);
          if (base) expect(file.content).toBe(base.content);
        }
      });
    });
  });

  describe('when cavemanStyle: false', () => {
    it('produces the same .md file set as cavemanStyle: true when templates have no filler', async () => {
      const off = await generateAll(makeStackConfig({ cavemanStyle: false }));
      const on = await generateAll(makeStackConfig({ cavemanStyle: true }));

      const offMd = off.filter((generatedFile) => generatedFile.path.endsWith('.md'));
      const onMd = on.filter((generatedFile) => generatedFile.path.endsWith('.md'));

      expect(offMd.map((generatedFile) => generatedFile.path).sort()).toEqual(
        onMd.map((generatedFile) => generatedFile.path).sort(),
      );
    });

    it('does not apply compression to non-.md files', async () => {
      const off = await generateAll(makeStackConfig({ cavemanStyle: false }));
      const on = await generateAll(makeStackConfig({ cavemanStyle: true }));

      const offNonMd = off.filter((generatedFile) => !generatedFile.path.endsWith('.md'));
      const onNonMd = on.filter((generatedFile) => !generatedFile.path.endsWith('.md'));

      expect(onNonMd.map((generatedFile) => generatedFile.path).sort()).toEqual(
        offNonMd.map((generatedFile) => generatedFile.path).sort(),
      );
      for (const file of onNonMd) {
        const match = offNonMd.find((offFile) => offFile.path === file.path);
        if (match) expect(file.content).toBe(match.content);
      }
    });
  });
});
