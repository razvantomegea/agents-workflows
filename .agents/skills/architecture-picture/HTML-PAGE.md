# HTML Page Format

The architecture picture is rendered as a single self-contained HTML file in the OS temp directory. Tailwind and Mermaid both come from CDNs. Mermaid handles graph-shaped diagrams; hand-built divs and inline SVG handle editorial visuals (module cards, before/after mass). Mix the two — don't lean on Mermaid for everything.

This is **one planned change**, not a list of deepening candidates.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture picture — {{feature name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      .seam { stroke-dasharray: 4 4; }
      .new { stroke: #059669; stroke-width: 2px; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-14">
      <header>...</header>
      <section id="big-picture">...</section>
      <section id="architecture">...</section>
      <section id="flow">...</section>
      <section id="modules">...</section>
      <footer id="open">...</footer>
    </main>
  </body>
</html>
```

## Header

Repo name, feature name, date, and a compact legend:

- solid box = module
- dashed line = seam
- emerald outline = new or changed
- thick dark box = deep module

No introduction paragraph — straight into the sections.

## Required sections

Each section has a diagram that carries the meaning. Prose is sparse and plain.

### 1. Big picture

Where this change sits in the current system. Context diagram: existing modules greyed, the change highlighted.

When changing existing structure, show **current vs proposed** side by side.

### 2. Architecture

Modules, seams, what each hides. Prefer before/after when structure changes; a single diagram when greenfield.

Name seams explicitly. Show what each module hides behind its interface.

### 3. Flow

Happy path plus the failure paths that matter. Mermaid `sequenceDiagram` or `flowchart` works well. Keep it to the decisions and hand-offs that matter — not every internal call.

### 4. Modules

One card per module involved in the change:

- **Name** — domain term when available
- **Responsibility** — one sentence
- **Interface** — what callers must know
- **Hides** — what stays inside
- **Files** — monospaced paths, `font-mono text-sm`

### Optional footer

Compact only when useful:

- Risks
- Open questions
- Files to create/modify

No paragraphs of explanation. If a diagram needs a paragraph to be understood, redraw the diagram.

## Diagram patterns

Pick the pattern that fits. Mix them.

### Mermaid graph (system context / dependencies)

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      UI[Checkout UI] --> Intake[Order intake]
      Intake --> Pay[Payment]
      Intake --> Stock[Inventory]
      classDef changed stroke:#059669,stroke-width:2px;
      class Intake changed
  </pre>
</div>
```

### Mermaid sequence (flow)

Use for request/response and failure branches. Highlight the new or changed steps.

### Hand-built boxes-and-arrows

Modules as `<div>`s with borders and labels. Arrows as inline SVG. Prefer this when you want one thick deep module with greyed internals — Mermaid won't give that weight.

### Before / After columns

Two columns, side by side, ~320px tall each. Label columns `Current` and `Proposed`. Emerald accent on what is new.

## Style guidance

- Lean editorial, not corporate-dashboard. Generous whitespace. Serif optional for headings (`font-serif` with stone/slate).
- Colour sparingly: one accent (emerald or indigo), amber for open questions, red only for failure paths that matter.
- Use `text-xs uppercase tracking-wider` for module labels inside diagrams — schematic, not UI.
- The only scripts are the Tailwind CDN and the Mermaid ESM import. Otherwise static.

## Tone

Plain English, concise.

**Prefer:** module, interface, implementation, seam, flow, depth (when `codebase-design` is present).

**Avoid substituting:** component, service, unit (for module) · API, signature (for interface) · boundary (for seam).

**Phrasings that fit:**

- "Order intake module sits behind one interface; pricing stays inside."
- "Seam between intake and payment: two adapters — Stripe, in-memory."
- "Happy path: validate → reserve → charge → confirm. Failure: reserve rolls back on charge fail."

No hedging. If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it.
