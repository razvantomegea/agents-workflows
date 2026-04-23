import { describe, expect, it } from '@jest/globals';
import { convertToSkill } from '../../src/utils/convert-to-skill.js';

describe('convertToSkill', () => {
  it('strips the model and color frontmatter entries', () => {
    const input = ['---', 'name: architect', 'model: opus', 'color: red', '---', ''].join('\n');
    const result = convertToSkill(input);
    expect(result).not.toMatch(/^model:/m);
    expect(result).not.toMatch(/^color:/m);
    expect(result).toContain('name: architect');
  });

  it('rewrites standalone agent/agents tokens to skill/skills, preserving case', () => {
    const input = 'An Agent reads files. Two agents collaborate. AGENT and AGENTS names.';
    expect(convertToSkill(input)).toBe(
      'A Skill reads files. Two skills collaborate. SKILL and SKILLS names.',
    );
  });

  it('fixes article grammar before singular skill tokens across casing', () => {
    const input = 'an agent, An Agent, and AN AGENT.';
    expect(convertToSkill(input)).toBe('a skill, A Skill, and A SKILL.');
  });

  it('rewrites hyphenated sub-agent forms including plurals', () => {
    const input = 'Spawn sub-agents in parallel. The sub-agent and Sub-agent delegation.';
    expect(convertToSkill(input)).toBe(
      'Spawn sub-skills in parallel. The sub-skill and Sub-skill delegation.',
    );
  });

  it('rewrites the subagent_delegation XML tag in open and close forms', () => {
    const input = '<subagent_delegation>body</subagent_delegation>';
    expect(convertToSkill(input)).toBe('<subskill_delegation>body</subskill_delegation>');
  });

  it('preserves the agent-authored GitHub label literal', () => {
    const input = 'PR is labeled `agent-authored` and requires review.';
    expect(convertToSkill(input)).toContain('`agent-authored`');
    expect(convertToSkill(input)).not.toContain('skill-authored');
  });

  it('preserves the agents-workflows project name literal', () => {
    const input = 'the `agents-workflows` project and `.agents-workflows.json` config.';
    const out = convertToSkill(input);
    expect(out).toContain('`agents-workflows`');
    expect(out).toContain('`.agents-workflows.json`');
    expect(out).not.toContain('skills-workflows');
  });

  it('preserves the AGENTS.md file name literal', () => {
    const input = 'Read AGENTS.md before planning.';
    expect(convertToSkill(input)).toContain('AGENTS.md');
    expect(convertToSkill(input)).not.toContain('SKILLS.md');
  });

  it('collapses runs of 3+ blank lines to a single blank line', () => {
    const input = 'line1\n\n\n\nline2';
    expect(convertToSkill(input)).toBe('line1\n\nline2');
  });
});
