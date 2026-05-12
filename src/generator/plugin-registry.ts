import type { StackConfig } from '../schema/stack-config.js';

export interface SkillDef {
  id: string;
}

export interface PluginDef {
  id: keyof StackConfig['plugins'];
  sourceId: string;
  name: string;
  description: string;
  skills: SkillDef[];
}

export const PLUGIN_REGISTRY: PluginDef[] = [
  {
    id: 'superpowers',
    sourceId: 'superpowers',
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
    sourceId: 'caveman',
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
    sourceId: 'claude-md-management',
    name: 'Claude MD Management',
    description: 'Audit and improve CLAUDE.md files; capture session learnings',
    skills: [
      { id: 'claude-md-improver' },
    ],
  },
];
