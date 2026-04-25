/** Epic 9 E9.T15 — Security smoke suite. Expectations derived from rendered artifacts. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig } from '../generator/fixtures.js';
import { SMOKE_CASES } from './smoke.cases.js';

interface ParsedSettings {
  permissions: { deny: string[] };
  hooks: { PreToolUse: Array<{ hooks: Array<{ command: string }> }> };
}

const PREFIX_RULE_BLOCK_RE = /prefix_rule\(([\s\S]*?)\n\)/g;
const POSIX_CHAR_CLASS_MAP: ReadonlyArray<readonly [RegExp, string]> = [
  [/\[\[:space:\]\]/g, '\\s'],
  [/\[\[:alpha:\]\]/g, '[A-Za-z]'],
  [/\[\[:alnum:\]\]/g, '[A-Za-z0-9]'],
  [/\[\[:digit:\]\]/g, '\\d'],
];

/** Asserts `token` appears inside a `prefix_rule(...)` block whose `decision = "forbidden"`. */
function expectCodexForbiddenToken(token: string, source: string): void {
  const forbiddenBlocks: string[] = [];
  for (const match of source.matchAll(PREFIX_RULE_BLOCK_RE)) {
    const body = match[1];
    if (body.includes('decision = "forbidden"')) forbiddenBlocks.push(body);
  }
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactTokenRe = new RegExp(`(^|[^A-Za-z0-9_.-])${escapedToken}([^A-Za-z0-9_.-]|$)`);
  const matched = forbiddenBlocks.some((body: string) => exactTokenRe.test(body));
  expect(matched).toBe(true);
}

/** True when `cmd` matches the POSIX ERE guard alternation after class substitution. */
function alternationMatches(cmd: string, alternation: string): boolean {
  let jsPattern = alternation;
  for (const [re, replacement] of POSIX_CHAR_CLASS_MAP) jsPattern = jsPattern.replace(re, replacement);
  if (/\[\[:[a-z]+:\]\]/.test(jsPattern)) {
    throw new Error(`Unhandled POSIX character class in guard alternation: ${jsPattern}`);
  }
  const lowerCommand = cmd.toLowerCase();
  const normalizedCommand = lowerCommand
    .replaceAll('${ifs}', ' ')
    .replaceAll('$ifs', ' ')
    .replace(/\\([A-Za-z0-9_.-])/g, '$1')
    .replaceAll(/['"]/g, '')
    .replaceAll(/\s+/g, ' ');
  return new RegExp(jsPattern).test(`${lowerCommand}\n${normalizedCommand}`);
}

let denyList: readonly string[] = [];
let guardAlternation = '';
let codexRules = '';

beforeAll(async () => {
  const files = await generateAll(makeStackConfig());
  const codexFile = files.find((file: GeneratedFile) => file.path === '.codex/rules/project.rules');
  const settingsFile = files.find((file: GeneratedFile) => file.path === '.claude/settings.json');
  if (!codexFile || !settingsFile) {
    throw new Error('Expected generated .codex/rules/project.rules and .claude/settings.json');
  }

  codexRules = codexFile.content;
  const parsed = JSON.parse(settingsFile.content) as ParsedSettings;
  denyList = parsed.permissions.deny;

  const hookCommand = parsed.hooks.PreToolUse[0]?.hooks[0]?.command ?? '';
  const match = /\npatterns=(".*?")\n/.exec(hookCommand);
  if (!match) throw new Error('Could not extract patterns= line from PreToolUse hook command');
  guardAlternation = JSON.parse(match[1]) as string;
});

describe('Epic 9 E9.T15 — security smoke suite (automated cases)', () => {
  SMOKE_CASES.forEach((smokeCase) => {
    it(`${smokeCase.id}: ${smokeCase.description} is blocked by policy`, () => {
      if (smokeCase.claudeDeny !== undefined) expect(denyList).toContain(smokeCase.claudeDeny);
      if (smokeCase.codexForbid !== undefined) expectCodexForbiddenToken(smokeCase.codexForbid, codexRules);
      if (smokeCase.guardCommand !== undefined) {
        expect(alternationMatches(smokeCase.guardCommand, guardAlternation)).toBe(true);
      }
    });
  });

  it('case-R3 (home-path): Edit(~/**) is also in the deny list', () => {
    expect(denyList).toContain('Edit(~/**)');
  });

  it('residual-case placeholder: sub-agent Task() bypass is documented, not fixed', () => {
    const partial = readFileSync(resolve('src/templates/partials/subagent-caveat.md.ejs'), 'utf8');
    expect(partial).toContain('#25000');
    expect(partial).toContain('#43142');
    expect(partial).toContain('deny list is defense-in-depth only');
  });
});
