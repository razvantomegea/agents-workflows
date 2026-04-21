import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateAll } from '../../src/generator/index.js';
import { makeStackConfig } from './fixtures.js';

const makeConfig = makeStackConfig;

describe('react-ts-senior agent', () => {
  it('emits react-ts-senior only when agents.reactTsSenior is true and renders expected content', async () => {
    const files = await generateAll(makeConfig());
    const agent = files.find((file) => file.path === '.claude/agents/react-ts-senior.md');

    expect(agent).toBeDefined();
    expect(agent?.content).toContain('React + TypeScript');
    expect(agent?.content).toContain('Readonly<');
    expect(agent?.content).toContain('useCallback');
    expect(agent?.content).toContain('useMemo');
    expect(agent?.content).toContain('test-app');
    expect(agent?.content.split(/\r?\n/).length).toBeLessThanOrEqual(200);

    const templatePath = join(process.cwd(), 'src/templates/agents/react-ts-senior.md.ejs');
    const templateSource = await readFile(templatePath, 'utf8');
    expect(templateSource).not.toMatch(/Tamagui|Expo Router|Supabase|useTranslations|DataTestId/);

    const baseConfig = makeConfig();
    const disabledConfig = {
      ...baseConfig,
      agents: { ...baseConfig.agents, reactTsSenior: false },
    };
    const disabledFiles = await generateAll(disabledConfig);
    const disabledPaths = disabledFiles.map((file) => file.path);
    expect(disabledPaths).not.toContain('.claude/agents/react-ts-senior.md');
  });
});
