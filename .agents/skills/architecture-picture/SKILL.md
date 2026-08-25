---
name: architecture-picture
description: Present a visual HTML architecture page for a planned change. Use when planning or implementing an architectural change, new module, cross-module feature, big feature, G2/G3 work, new subsystem, or data-model change - before writing production code.
---

# Architecture Picture

Produce a self-contained HTML page that shows the big picture, architecture, flow, and modules for a planned change. The page is the shared mental model the human reviews before implementation.

Skip G0/G1 and small/medium work. Fire for large or architectural changes, new modules/subsystems, cross-module features, data-model changes, and G2/G3 work.

## Process

### 1. Classify

If the change is not large/architectural/module/big-feature, skip this skill. Do not invent ceremony for trivial work.

### 2. Explore

Read existing domain docs when present (`CONTEXT.md`, `/docs/context.md`, ADRs) and the modules this change touches. Use domain names from those docs — not invented labels.

If the `codebase-design` skill is available, use its glossary (**module**, **interface**, **seam**, **depth**, **adapter**, **leverage**, **locality**). If not, still say **module / interface / flow** — never invent a parallel vocabulary.

### 3. Write the page

Follow [HTML-PAGE.md](HTML-PAGE.md). Visual first; sparse prose. Diagrams carry the meaning.

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo. Resolve the temp dir from `$TMPDIR`, falling back to `/tmp` (or `%TEMP%` on Windows), and write to `<tmpdir>/architecture-picture-<timestamp>.html` so each run gets a fresh file.

### 4. Open it

Open for the user — `xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows — and tell them the absolute path.

### 5. Stop for feedback

Ask whether the picture is right. Do not implement until the human confirms (or gives an existing G2/G3 approval phrase such as `Approved` / `Implement`).

The architecture picture *is* the human feedback checkpoint for large/architectural work.

### 6. After implementation

If what shipped diverged from the picture, update the page and reopen it. Otherwise leave the page alone.

## Out of scope

- Not a deepening-candidates review — that is `improve-codebase-architecture`.
- Not a Cursor canvas.
- Do not commit the HTML into the repository.
