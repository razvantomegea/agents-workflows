import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

export const FIXTURES_DIR = join(CURRENT_DIR, '..', '..', 'fixtures');
export const IMPLEMENTER_CLAUDE_PATH = '.claude/agents/implementer.md';
export const IMPLEMENTER_CODEX_PATH = '.codex/skills/implementer/SKILL.md';
export const UI_DESIGNER_CLAUDE_PATH = '.claude/agents/ui-designer.md';
