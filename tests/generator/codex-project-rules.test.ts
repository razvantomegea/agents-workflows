import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { escapeRegexLiteral } from '../../src/generator/permission-constants.js';

const TEMPLATE_PATH = resolve('src/templates/config/codex-project-rules.ejs');
const content = readFileSync(TEMPLATE_PATH, 'utf8');
const PREFIX_RULE_BLOCK_RE = /prefix_rule\(([\s\S]*?)\n\)/g;
const prefixRuleBlocks = [...content.matchAll(PREFIX_RULE_BLOCK_RE)].map((match: RegExpMatchArray) => match[1]);

const FORBIDDEN_TOKENS = [
  'Remove-Item',
  'Remove-ItemProperty',
  'del',
  'erase',
  'rmdir',
  'rd',
  'Invoke-WebRequest',
  'iwr',
  'Invoke-RestMethod',
  'irm',
  'curl.exe',
  'wget.exe',
  'pwsh.exe',
  'powershell.exe',
  '-c',
  '"commit"',
  '"push"',
  '"--amend"',
  '"--hard"',
  '"-fd"',
  '"-D"',
  '"rm"',
  '"sudo"',
  'twine',
  'terraform',
  'kubectl',
] as const;

const ALLOW_TOKENS = [
  '"pnpm"',
  '"npm"',
  '"yarn"',
  '"npx"',
  '"node"',
  '"tsc"',
  '"jest"',
  '"python"',
  '"pip"',
  '"status"',
  '"diff"',
  '"log"',
  '"branch"',
] as const;

function hasTokenAndDecision(token: string, decision: 'allow' | 'forbidden'): boolean {
  const escapedToken = escapeRegexLiteral(token);
  const tokenRe = new RegExp(escapedToken);
  const decisionRe = new RegExp(`decision\\s*=\\s*"${decision}"`);
  return prefixRuleBlocks.some((block: string) => tokenRe.test(block) && decisionRe.test(block));
}

describe('codex-project-rules.ejs - forbidden rules include pattern + forbidden decision', () => {
  it.each(FORBIDDEN_TOKENS)('contains forbidden rule shape for token: %s', (token: string) => {
    expect(hasTokenAndDecision(token, 'forbidden')).toBe(true);
  });
});

describe('codex-project-rules.ejs - allow rules include pattern + allow decision', () => {
  it.each(ALLOW_TOKENS)('contains allow rule shape for token: %s', (token: string) => {
    expect(hasTokenAndDecision(token, 'allow')).toBe(true);
  });
});

describe('codex-project-rules.ejs - safety invariants', () => {
  it('does not contain an unscoped broad allow for git (no pattern = ["git"])', () => {
    // A standalone ["git"] without subcommands would grant full git access.
    // The pattern must be ["git", [...subcommands]] - the string `"git"]` closes an
    // array that has only "git", which is what we want to forbid.
    expect(content).not.toMatch(/pattern\s*=\s*\["git"\]/);
  });

  it('does not contain plain "curl" as a standalone forbidden token', () => {
    // Plain curl (without .exe) remains allowable per E9.T11.
    // Ensure no rule forbids bare "curl" outright.
    expect(content).not.toMatch(/"curl"[^.].*decision\s*=\s*"forbidden"/s);
  });

  it('does not contain plain "wget" as a standalone forbidden token', () => {
    // Plain wget (without .exe) remains allowable per E9.T11.
    expect(content).not.toMatch(/"wget"[^.].*decision\s*=\s*"forbidden"/s);
  });

  it('does not include broad raw-runtime allow prefixes', () => {
    expect(content).not.toContain(
      'pattern = [["node", "npm", "npx", "pnpm", "yarn", "tsc", "tsx", "vitest", "jest", "eslint", "prettier"]]',
    );
    expect(content).not.toContain('pattern = [["python", "python3", "pip"]]');
  });
});
