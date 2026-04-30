import type { StackConfig } from '../schema/stack-config.js';

export interface SkillDef {
  id: string;
}

export interface PluginDef {
  id: keyof StackConfig['plugins'];
  name: string;
  description: string;
  skills: SkillDef[];
}

export const PLUGIN_REGISTRY: PluginDef[] = [
  {
    id: 'superpowers',
    name: 'Superpowers',
    description: 'Structured TDD, debugging, brainstorming, and planning methodology skills',
    skills: [
      { id: 'brainstorming' },
      { id: 'writing-plans' },
      { id: 'executing-plans' },
      { id: 'test-driven-development' },
      { id: 'systematic-debugging' },
      { id: 'requesting-code-review' },
      { id: 'receiving-code-review' },
      { id: 'verification-before-completion' },
      { id: 'dispatching-parallel-agents' },
      { id: 'subagent-driven-development' },
      { id: 'using-superpowers' },
      { id: 'using-git-worktrees' },
      { id: 'finishing-a-development-branch' },
      { id: 'writing-skills' },
    ],
  },
  {
    id: 'caveman',
    name: 'Caveman',
    description: 'Ultra-compressed token-efficient communication mode (~75% output reduction)',
    skills: [
      { id: 'caveman' },
      { id: 'caveman-commit' },
      { id: 'caveman-compress' },
      { id: 'caveman-help' },
      { id: 'caveman-review' },
      { id: 'compress' },
    ],
  },
  {
    id: 'claudeMdManagement',
    name: 'Claude MD Management',
    description: 'Audit and improve CLAUDE.md files; capture session learnings',
    skills: [
      { id: 'claude-md-improver' },
      { id: 'revise-claude-md' },
    ],
  },
  {
    id: 'featureDev',
    name: 'Feature Dev',
    description: 'Guided 7-phase feature development workflow with codebase exploration and architecture design',
    skills: [
      { id: 'feature-dev' },
    ],
  },
  {
    id: 'codeReviewPlugin',
    name: 'Code Review',
    description: 'Multi-agent PR review with confidence-based scoring to reduce false positives',
    skills: [
      { id: 'code-review' },
    ],
  },
  {
    id: 'codeSimplifier',
    name: 'Code Simplifier',
    description: 'Review changed code for reuse, quality, and efficiency, then fix issues found',
    skills: [
      { id: 'simplify' },
    ],
  },
];
