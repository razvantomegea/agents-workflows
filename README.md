# Agentic Engineering

A minimal, vendor-neutral starter for using coding agents without
outsourcing understanding, judgment, or responsibility.

Copy these files into any software project. They work with any capable
coding agent.

> **Agents are code generators; engineers are responsible for system
> design, constraints, verification, and judgment.**

The goal is not merely correct generated code.

The goal is a continuous human ↔ agent feedback loop so the engineer
still owns the system: intent, behavior, logic, architecture,
invariants, tradeoffs, and verification.

```text
Human Intent
    ↓
Agent Interpretation
    ↓
Shared Mental Model
    ↓
Human Feedback
    ↓
Logic / Algorithm
    ↓
Implementation
    ↓
Agent Explanation
    ↓
Verification
    ↓
Human Understanding
```

If the human engineer can no longer explain the important behavior of
the system after agent work, the loop has failed.

## Contents

```text
AGENTS.md
.agents/skills/engineering-feedback-loop/SKILL.md
.agents/skills/architecture-picture/SKILL.md
.agents/skills/architecture-picture/HTML-PAGE.md
.agents/skills/frontend-interview-drill/SKILL.md
```

- `AGENTS.md` is the philosophy. Drop it at the project root. Many
  coding agents read this file automatically.
- `engineering-feedback-loop` is the practice. It tells the agent when
  and how to keep the feedback loop, scaled to small, medium, and large
  changes.
- `architecture-picture` produces a visual HTML page (big picture,
  architecture, flow, modules) for large or architectural work before
  implementation. Temp file, open in browser — nothing committed to the
  repo.
- `frontend-interview-drill` is the interviewer. Use it in a practice
  workspace (`interviews`) to assign TypeScript, React, or Next.js
  challenges, hint without spoiling, and verify by running tests.

This repository intentionally contains no vendor-specific tooling: no
package manager, CI, MCP config, or Claude / Codex / Cursor setup.

## Use in another project

1. Copy `AGENTS.md` to the other project's root.
2. Copy `.agents/skills/engineering-feedback-loop/` into that project's
   `.agents/skills/` directory (create the folders if needed).
3. Copy `.agents/skills/architecture-picture/` into that project's
   `.agents/skills/` directory.
4. For interview practice, also copy
   `.agents/skills/frontend-interview-drill/` into the exam-room repo
   (`interviews`).
5. Point the agent at the copied files if it does not load them by
   default.

Keep project-specific conventions in the host repository. Do not add
stack, vendor, or product rules to `AGENTS.md`,
`engineering-feedback-loop`, or `architecture-picture`.

## What this is not

This is not a framework, CLI, or agent runtime.

It does not make the engineer unnecessary. It makes the engineer more
effective while keeping them informed and in control.
