# agents-workflows

[![npm version](https://img.shields.io/npm/v/agents-workflows.svg)](https://www.npmjs.com/package/agents-workflows)
[![license](https://img.shields.io/npm/l/agents-workflows.svg)](./LICENSE)

Reusable AI agent configuration framework. Install battle-tested Claude Code agents, Codex CLI skills, and workflow commands into any project, adapted to your stack.

## What it does

This CLI tool extracts proven agentic workflow patterns into parameterized templates that adapt to your project's technology stack. Instead of writing agent configurations from scratch, you answer a few questions and get a complete set of:

- **Up to 10 specialized agents**: architect, implementer, react-ts-senior (React + TypeScript stacks only), code-reviewer, security-reviewer, code-optimizer, test-writer, e2e-tester, reviewer, ui-designer
- **3 workflow commands**: `/workflow-plan`, `/workflow-fix`, `/external-review`
- **Root config files**: `AGENTS.md`, plus `CLAUDE.md` and `.claude/settings.local.json` when Claude Code output is selected
- **Sync scripts**: Codex CLI integration with `.codex/` skills and prompts

## Quick start

```bash
npx agents-workflows init
# or
pnpm dlx agents-workflows init
# or
bunx agents-workflows init
```

The CLI will:

1. **Detect** your project stack (language, framework, UI library, database, auth, testing, linting)
2. **Ask** interactive questions for anything it can't detect
3. **Generate** adapted agent configurations in `.claude/agents/`, `.codex/skills/`, and root config files
4. **Write** a manifest (`.agents-workflows.json`) for future updates

## Supported stacks

| Category | Detected |
|---|---|
| Languages | TypeScript, JavaScript, Python, Go, Rust, Java, C# |
| Frameworks | React, Next.js, Expo, React Native, Remix, Vue, Nuxt, SvelteKit, Angular, NestJS, Express, Fastify, Hono, FastAPI, Django, Flask |
| UI Libraries | Tailwind, NativeWind, Tamagui, MUI, Chakra, Mantine, shadcn/ui, Ant Design |
| State | Zustand, Redux, Jotai, Recoil, MobX, Pinia, TanStack Query |
| Databases | Supabase, Prisma, Drizzle, Firebase, Mongoose, TypeORM, Knex, Sequelize, SQLAlchemy, Django ORM, Tortoise ORM |
| Auth | NextAuth/Auth.js, Clerk, Auth0, Supabase Auth, Lucia, Firebase Auth |
| Testing | Jest, Vitest, Mocha, AVA, pytest, Go test |
| E2E | Playwright, Cypress, Maestro, Detox |
| Linters | ESLint, Oxlint, Biome, Ruff |
| Package Managers | npm, pnpm, yarn, bun, pip, pipenv, poetry, uv, go mod |

## Generated agents

| Agent | Role | Model |
|---|---|---|
| `architect` | Planning only; produces structured `PLAN.md` with max 8 tasks | Opus |
| `implementer` | Primary code writing agent adapted to your stack | Sonnet |
| `react-ts-senior` | Senior React + TypeScript implementation agent (enabled only for React stacks on TypeScript) | Sonnet |
| `code-reviewer` | Post-edit review with project-specific checklist | Sonnet |
| `security-reviewer` | OWASP/security audit (injection, auth, secrets, data exposure) | Sonnet |
| `code-optimizer` | Performance, DRY, and quality analysis | Sonnet |
| `test-writer` | Unit test generation (Jest/Vitest/pytest/Go) | Sonnet |
| `e2e-tester` | E2E test generation (Playwright/Cypress/Maestro) | Sonnet |
| `reviewer` | 4-step review loop orchestrator (review, fix, type-check, test) | Sonnet |
| `ui-designer` | UI/UX design system enforcement (frontend only) | Sonnet |

## Workflow patterns

### `/workflow-plan`: End-to-end feature development

1. Branch setup from `main`
2. `architect` agent produces structured `PLAN.md`
3. Execute all tasks with sub-agent routing (UI to `ui-designer` first, tests to `test-writer`, etc.)
4. `code-reviewer` after each task, `code-optimizer` after all tasks
5. `reviewer` orchestrates the final 4-step quality gate

### `/workflow-fix`: Fix QA issues

1. Read `QA.md` findings
2. Verify each finding against actual code
3. Fix verified issues with appropriate sub-agents
4. Run the mandatory review loop

## Updating configurations

After modifying your `.agents-workflows.json` config:

```bash
npx agents-workflows update
```

This re-renders templates, shows a diff for each changed file, and lets you confirm before writing.

Use `--yes` to apply update diffs without the confirmation prompt.

```bash
npx agents-workflows update --yes
```

## Non-interactive usage

Use `--config` to initialize from a complete StackConfig JSON file, or `--yes` to use detected values plus defaults without prompts.

```bash
npx agents-workflows init --config ./agents-workflows.config.json
npx agents-workflows init --yes
```

## What gets written

| Target | Output paths |
|---|---|
| Always | `AGENTS.md`, `.agents-workflows.json` |
| Claude Code | `.claude/agents/*.md`, `.claude/commands/*.md`, `.claude/scripts/*.sh`, `CLAUDE.md`, `.claude/settings.local.json` |
| Codex CLI | `.codex/skills/*/SKILL.md`, `.codex/prompts/*.md`, `.codex/scripts/sync-codex.sh`, `.codex/scripts/sync-codex.ps1` |

## Generated example

Generated agents include stack context and shared rules. For example, `.claude/agents/implementer.md` starts with frontmatter and a role-specific prompt:

```markdown
---
name: implementer
description: "Senior implementation agent adapted to the detected project stack."
model: sonnet
color: green
---

You are a senior **nextjs / typescript** implementation agent for the `my-project` project.
```

## Customization

Generated files use marker comments to separate managed and custom sections:

```markdown
<!-- agents-workflows:managed-start -->
... auto-generated content ...
<!-- agents-workflows:managed-end -->

## Your Custom Rules
... add project-specific rules here, preserved across updates ...
```

## CLI commands

```bash
agents-workflows init      # Detect stack + generate configurations
agents-workflows update    # Re-generate from .agents-workflows.json
agents-workflows list      # Show available agents and commands
```

## Development

```bash
pnpm install
pnpm check-types    # TypeScript compiler check
pnpm lint           # Run Oxlint
pnpm test           # Run Jest tests
pnpm build          # Build to dist/
```

## License

Apache-2.0
