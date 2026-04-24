import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TEMPLATE_PATH = resolve('src/templates/config/codex-project-rules.ejs');
const content = readFileSync(TEMPLATE_PATH, 'utf8');

// E9.T10 — Windows-native destructive removals
const E9_T10_TOKENS = [
  'Remove-Item',
  'Remove-ItemProperty',
  'del',
  'erase',
  'rmdir',
  'rd',
];

// E9.T11 — Exfil vectors (Windows .exe and PS aliases)
const E9_T11_TOKENS = [
  'Invoke-WebRequest',
  'iwr',
  'Invoke-RestMethod',
  'irm',
  'curl.exe',
  'wget.exe',
];

// E9.T12 — Shell wrapper bypass
const E9_T12_TOKENS = [
  'pwsh',
  'powershell',
  '-Command',
  '-c',
  '-EncodedCommand',
  'cmd',
  '/c',
  '/k',
];

// E9.T3 — Destructive git
const E9_T3_GIT_TOKENS = [
  '"commit"',
  '"push"',
  '"--amend"',
  '"--hard"',
  '"-fd"',
  '"-D"',
];

// E9.T3 — Unix + infra forbids
const E9_T3_INFRA_TOKENS = [
  '"rm"',
  '"sudo"',
  'twine',
  'terraform',
  'kubectl',
];

// Allow rules that must appear
const ALLOW_TOKENS = [
  '"node"',
  '"pnpm"',
  '"tsc"',
  '"jest"',
  '"eslint"',
  '"prettier"',
  '"python"',
  '"pip"',
  '"status"',
  '"diff"',
  '"log"',
  '"branch"',
  '"add"',
  '"checkout"',
  '"switch"',
  '"stash"',
];

describe('codex-project-rules.ejs — E9.T10 Windows destructive removal forbids', () => {
  it.each(E9_T10_TOKENS)('template contains forbidden token: %s', (token) => {
    expect(content).toContain(token);
  });
});

describe('codex-project-rules.ejs — E9.T11 exfil vector forbids', () => {
  it.each(E9_T11_TOKENS)('template contains forbidden token: %s', (token) => {
    expect(content).toContain(token);
  });
});

describe('codex-project-rules.ejs — E9.T12 shell wrapper bypass forbids', () => {
  it.each(E9_T12_TOKENS)('template contains forbidden token: %s', (token) => {
    expect(content).toContain(token);
  });
});

describe('codex-project-rules.ejs — E9.T3 destructive git forbids', () => {
  it.each(E9_T3_GIT_TOKENS)('template contains git forbid token: %s', (token) => {
    expect(content).toContain(token);
  });
});

describe('codex-project-rules.ejs — E9.T3 Unix + infra forbids', () => {
  it.each(E9_T3_INFRA_TOKENS)('template contains infra forbid token: %s', (token) => {
    expect(content).toContain(token);
  });
});

describe('codex-project-rules.ejs — allow rules present', () => {
  it.each(ALLOW_TOKENS)('template contains allow token: %s', (token) => {
    expect(content).toContain(token);
  });
});

describe('codex-project-rules.ejs — safety invariants', () => {
  it('does not contain an unscoped broad allow for git (no pattern = ["git"])', () => {
    // A standalone ["git"] without subcommands would grant full git access.
    // The pattern must be ["git", [...subcommands]] — the string `"git"]` closes an
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
});
