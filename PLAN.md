# PLAN — Epic 14 Post-Init Workspace Refinement Prompt

Branch: `feature/epic-14-refine-prompt`

## Context
Emit `AGENTS_REFINE.md` after `init`/`update`. Print "next step" line. Provide `--no-refine-prompt` opt-out. All writes via `writeFileSafe` (Epic 7). Planning-only handoff per PRD §1.20 / §1.13 / §1.3.

## Tasks

### T1 [LOGIC] Refinement prompt template
- Files: `src/templates/refine/AGENTS_REFINE.md.ejs` (new)
- Output: 6 §1.20 sections; enabled-agent enumeration; verbatim DoD commands; cross-refs §1.3 §1.6 §1.13 §2.1.

### T2 [LOGIC] Generator entry + wiring
- Files: `src/generator/generate-refine-prompt.ts` (new), `src/generator/index.ts`
- `generateAll(config, opts?: {refinePrompt?: boolean})`; default `true`.

### T3 [LOGIC] CLI flag plumbing
- Files: `src/cli/index.ts`, `src/cli/init-command.ts`, `src/cli/update-command.ts`
- `--no-refine-prompt` on both commands; thread `refinePrompt` to `generateAll` + suppress message.

### T4 [LOGIC] Init next-step message
- Files: `src/cli/init-command.ts`. Append handoff line after existing "next:" block when refinePrompt enabled.

### T5 [LOGIC] Update parity message
- Files: `src/cli/update-command.ts`. Print same handoff line after success.

### T6 [TEST] Snapshot test
- Files: `tests/generator/refine-prompt.test.ts` (new)
- Assert §1.20 headings; agents enumerated; DoD commands verbatim; PRD cross-refs; opt-off omits file.

### T7 [DOC] README "After init" section
- Files: `README.md`. Purpose, Claude/Codex one-liners, opt-out flag, §1.3 fail-safe.

## External errors
