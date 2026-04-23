const PRESERVED_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ['agent-authored', '__AW_PRESERVE_AGENT_AUTHORED__'],
  ['agents-workflows', '__AW_PRESERVE_AGENTS_WORKFLOWS__'],
  ['AGENTS.md', '__AW_PRESERVE_AGENTS_MD__'],
];

const AGENT_CASE_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bAgents\b/g, 'Skills'],
  [/\bagents\b/g, 'skills'],
  [/\bAGENTS\b/g, 'SKILLS'],
  [/\bAgent\b/g, 'Skill'],
  [/\bagent\b/g, 'skill'],
  [/\bAGENT\b/g, 'SKILL'],
  // Plain substring (no \b): covers subagent_delegation (`_` is a word char so
  // \bsubagent\b cannot fire) and subagents plural in one step.
  [/Subagent/g, 'Subskill'],
  [/subagent/g, 'subskill'],
  [/SUBAGENT/g, 'SUBSKILL'],
];

function applyTokenPairs(
  input: string,
  pairs: ReadonlyArray<readonly [string, string]>,
): string {
  let output = input;
  for (const [from, to] of pairs) {
    output = output.split(from).join(to);
  }
  return output;
}

export function convertToSkill(agentContent: string): string {
  const withPreserved = applyTokenPairs(agentContent, PRESERVED_TOKENS);

  let renamed = withPreserved
    .replace(/^model: .+\r?\n/m, '')
    .replace(/^color: .+\r?\n/m, '');

  for (const [pattern, replacement] of AGENT_CASE_REPLACEMENTS) {
    renamed = renamed.replace(pattern, replacement);
  }

  renamed = renamed.replace(
    /\b(an)(\s+)(skills?)\b/gi,
    (_fullMatch: string, article: string, whitespace: string, noun: string): string => {
      const fixedArticle = article[0] === article[0].toUpperCase() ? 'A' : 'a';
      return `${fixedArticle}${whitespace}${noun}`;
    },
  );

  renamed = renamed.replace(/\n{3,}/g, '\n\n');

  const restorePairs = PRESERVED_TOKENS.map(
    ([original, sentinel]) => [sentinel, original] as const,
  );
  return applyTokenPairs(renamed, restorePairs);
}
