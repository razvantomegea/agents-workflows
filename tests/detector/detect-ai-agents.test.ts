import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectAiAgents,
  hasAnyEnvVar,
  hasConfigPath,
  isCommandOnPath,
} from '../../src/detector/detect-ai-agents.js';

async function withTmpDir(test: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'agents-ai-'));
  try {
    await test(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('detectAiAgents helpers', () => {
  it('returns false for an impossible command name', async () => {
    await expect(isCommandOnPath('agents-workflows-impossible-command-xyz')).resolves.toBe(false);
  });

  it('checks config path existence without reading contents', async () => {
    await withTmpDir(async (dir) => {
      const configDir = join(dir, '.claude');
      const configFile = join(dir, '.aider.conf.yml');
      await mkdir(configDir, { recursive: true });
      await writeFile(configFile, '', 'utf-8');

      await expect(hasConfigPath(configDir)).resolves.toBe(true);
      await expect(hasConfigPath(configFile)).resolves.toBe(true);
      await expect(hasConfigPath(join(dir, '.missing'))).resolves.toBe(false);
    });
  });

  it('reports env var names without reading values', () => {
    const original = process.env.AGENTS_WORKFLOWS_TEST_KEY;
    process.env.AGENTS_WORKFLOWS_TEST_KEY = 'secret-value-that-must-not-leak';

    try {
      expect(hasAnyEnvVar(['AGENTS_WORKFLOWS_TEST_KEY'])).toEqual({
        present: true,
        matched: ['AGENTS_WORKFLOWS_TEST_KEY'],
      });
    } finally {
      if (original === undefined) {
        delete process.env.AGENTS_WORKFLOWS_TEST_KEY;
      } else {
        process.env.AGENTS_WORKFLOWS_TEST_KEY = original;
      }
    }
  });
});

describe('detectAiAgents', () => {
  it('returns eight entries with boolean detection fields when PATH is empty', async () => {
    const originalPath = process.env.PATH;
    const originalPathWindows = process.env.Path;

    try {
      process.env.PATH = '';
      process.env.Path = '';
      const result = await detectAiAgents();

      expect(result.agents).toHaveLength(8);
      expect(typeof result.hasClaudeCode).toBe('boolean');
      expect(typeof result.hasCodexCli).toBe('boolean');

      for (const agent of result.agents) {
        expect(typeof agent.cliAvailable).toBe('boolean');
        expect(typeof agent.configPresent).toBe('boolean');
        expect(typeof agent.apiKeyPresent).toBe('boolean');
        expect(Array.isArray(agent.matchedEnvVars)).toBe(true);
      }
    } finally {
      if (originalPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = originalPath;
      }

      if (originalPathWindows === undefined) {
        delete process.env.Path;
      } else {
        process.env.Path = originalPathWindows;
      }
    }
  });

  it('does not include env var values in the returned object', async () => {
    const originalPath = process.env.PATH;
    const originalPathWindows = process.env.Path;
    const envNames = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'COPILOT_GITHUB_TOKEN',
      'GH_TOKEN',
      'GITHUB_TOKEN',
      'GEMINI_API_KEY',
    ];
    const originals = new Map(envNames.map((name) => [name, process.env[name]]));
    const secret = 'sk-ant-test-secret-that-must-not-leak';

    try {
      process.env.PATH = '';
      process.env.Path = '';
      for (const name of envNames) {
        delete process.env[name];
      }
      process.env.ANTHROPIC_API_KEY = secret;

      const result = await detectAiAgents();
      expect(JSON.stringify(result)).not.toContain(secret);
      expect(redactBooleans(result)).toMatchSnapshot();
    } finally {
      if (originalPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = originalPath;
      }

      if (originalPathWindows === undefined) {
        delete process.env.Path;
      } else {
        process.env.Path = originalPathWindows;
      }

      for (const [name, value] of originals) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  });
});

function redactBooleans(value: unknown): unknown {
  if (typeof value === 'boolean') return '<boolean>';
  if (Array.isArray(value)) return value.map(redactBooleans);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, redactBooleans(nestedValue)]),
    );
  }

  return value;
}
