---
name: engineering-feedback-loop
description: Maintain a continuous human-agent engineering feedback loop so the agent accelerates implementation without replacing the engineer's understanding of requirements, logic, algorithms, architecture, or verification. Use for non-trivial software engineering work, debugging, refactoring, architecture changes, or whenever generated code could cause the human to lose track of the system.
---

# Engineering Feedback Loop

## Purpose

Prevent the human engineer from outsourcing understanding and judgment to
the coding agent.

The agent may generate, modify, refactor, test, debug, analyze, and review
code.

The human engineer must retain understanding of:

* requirements
* system behavior
* business logic
* algorithms
* architecture
* invariants
* important tradeoffs
* failure modes
* verification

Code is an implementation language.

The primary engineering artifact is the reasoning and model that the code
represents.

---

# Core Loop

Maintain this loop:

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

Never silently convert human intent into implementation.

The objective is shared understanding, not merely completed code.

---

# 1. Determine the Change Size

Not every change requires the same amount of ceremony.

### Small change

Examples:

* obvious typo
* trivial rename
* straightforward one-line fix
* mechanical change with no meaningful behavioral impact

Use:

```text
Implement
    ↓
Verify
    ↓
Briefly explain
```

### Medium change

Examples:

* new function
* business-rule change
* API change
* non-trivial bug fix
* meaningful refactor

Use:

```text
Understand
    ↓
Model
    ↓
Implement
    ↓
Explain
    ↓
Verify
```

### Large or architectural change

Examples:

* new subsystem
* data-model change
* major refactor
* distributed behavior
* concurrency
* authentication/authorization
* persistence architecture
* significant algorithmic change

Use:

```text
Understand
    ↓
Model
    ↓
Architecture Picture
    ↓
Human Feedback
    ↓
Implement
    ↓
Explain
    ↓
Verify
    ↓
Compare
    ↓
Teach-back
```

When the `architecture-picture` skill is present, produce and open the
architecture picture before the human feedback checkpoint. That page is
the shared mental model for large or architectural work.

Do not add ceremony merely for its own sake.

The purpose of the distinction is to protect the feedback loop without
making trivial work unnecessarily slow.

---

# 2. Understand

Before implementing a medium or large change, establish the problem.

Communicate:

## Goal

What problem are we solving?

## Current Behavior

What does the system do today?

## Desired Behavior

What should happen instead?

## Constraints

What must not change?

## Relevant Context

What existing components, data, APIs, or invariants are involved?

## Assumptions

What are we currently assuming?

## Unknowns

What remains uncertain?

## Risks

What could make the proposed approach incorrect or unsafe?

Do not pretend uncertainty does not exist.

If an unknown could materially change the solution, surface it before
implementation.

---

# 3. Build the Mental Model

Before discussing code, explain the system in conceptual terms.

Depending on the problem, describe:

* domain entities
* relationships
* states
* transitions
* inputs
* outputs
* invariants
* data flow
* control flow
* external dependencies
* failure boundaries

For example, prefer:

> "An order can transition from pending to paid to shipped. Cancellation
> is terminal and is allowed before shipment, subject to the refund rule."

over:

> "I'll modify OrderService.ts and add validateCancellation()."

The first communicates engineering logic.

The second communicates implementation mechanics.

---

# 4. Explain the Logic and Algorithm

Before significant implementation, communicate:

### Behavior

What should the system do?

### Logic

What decisions should it make?

### Algorithm

What sequence of operations produces the desired behavior?

### Invariants

What must always remain true?

### Edge Cases

What happens at the boundaries?

### Failure Behavior

What happens when something goes wrong?

The human should be able to challenge the proposed logic without reading
the code.

---

# 5. Human Feedback Checkpoint

For large or materially ambiguous changes, explicitly communicate the
proposed model before implementation.

When the `architecture-picture` skill is present and the change is large
or architectural, produce and open the architecture picture first. That
page is the checkpoint artifact — big picture, architecture, flow, and
modules. Use the text structure below for medium ambiguity or when the
skill is absent.

Use a concise structure:

```text
UNDERSTANDING

Goal:
...

Current behavior:
...

Desired behavior:
...

LOGIC

...

ALGORITHM

1. ...
2. ...
3. ...

INVARIANTS

- ...
- ...

ASSUMPTIONS

- ...

RISKS / UNCERTAINTIES

- ...

PROPOSED DESIGN

...
```

Then allow the human engineer to correct the model.

Do not continue with a materially ambiguous interpretation merely because
an implementation is possible.

The feedback checkpoint exists to catch:

> correct implementation of an incorrectly understood requirement.

---

# 6. Implement

Once the mental model is sufficiently understood:

* implement the smallest coherent change
* reuse existing concepts when appropriate
* avoid speculative abstractions
* keep dependencies explicit
* preserve invariants
* keep changes localized
* avoid unrelated refactoring

Important implementation decisions must remain traceable to the logic.

Do not silently introduce significant:

* abstractions
* dependencies
* persistence models
* concurrency mechanisms
* caching
* retries
* queues
* background processing
* APIs
* architectural layers

without explaining why they are necessary.

---

# 7. Explain What Actually Happened

After implementation, do not merely say:

> "Implemented the requested feature."

Explain the resulting system.

Use:

```text
WHAT CHANGED

...

RESULTING BEHAVIOR

...

LOGIC

...

ALGORITHM

...

IMPORTANT DECISIONS

...

INVARIANTS

...

EDGE CASES

...

VERIFICATION

...

REMAINING UNCERTAINTY

...
```

The explanation should describe behavior and reasoning rather than provide
a line-by-line narration of the code.

---

# 7a. Human Understanding Check (Teach-back)

After large/architectural work, or after executing an approved complex
plan (G2/G3-equivalent), do not treat the task as fully closed after
Explain and Verify alone.

Ask **2–4 short teach-back questions** on topics the human must own:

* resulting behavior
* logic / algorithm
* invariants
* important trade-offs
* failure modes
* what was verified (and what was not)

Do **not** quiz on file diffs, renames, or trivial edits.

Flow:

```text
Ask
    ↓
Wait for human answers
    ↓
Correct misunderstandings briefly
```

Do not mark the complex change complete until the human has engaged, or
has explicitly declined the check.

Skip teach-back for small changes and for routine medium work that does
not rise to complex-plan / large scope.

---

# 8. Compare Intended vs Actual

This is one of the most important parts of the skill.

Compare:

```text
INTENDED MODEL
      ↓
ACTUAL IMPLEMENTATION
      ↓
VERIFICATION
```

Explicitly identify:

* what matches
* what differs
* why anything differs
* what remains unverified

Use language such as:

> "This is what I understood you wanted."

and:

> "This is what I actually implemented."

If they differ, explain why.

Never hide discrepancies simply because the implementation appears to work.

---

# 9. Verification

Verify the implementation using appropriate evidence.

Possible feedback mechanisms include:

* compiler
* type checker
* unit tests
* integration tests
* end-to-end tests
* static analysis
* linters
* runtime behavior
* logs
* measurements
* manual inspection

Report exactly what was run.

Never claim:

* "tests pass" when tests were not run
* "verified" when only code inspection occurred
* "works" based solely on an assumption

Distinguish:

```text
Verified
Assumed
Not tested
Unknown
```

when useful.

---

# 10. Debugging Loop

When debugging, do not immediately change code.

First establish:

```text
OBSERVED
    ↓
EXPECTED
    ↓
DIFFERENCE
    ↓
HYPOTHESES
    ↓
EVIDENCE
    ↓
ROOT CAUSE
    ↓
FIX
    ↓
VERIFICATION
```

Before editing, communicate:

1. Observed behavior
2. Expected behavior
3. Difference
4. Candidate causes
5. Evidence supporting each
6. Most likely cause
7. Proposed fix
8. Verification plan

After the fix:

1. Explain the root cause.
2. Explain why the fix addresses it.
3. Explain what prevents regression.
4. Verify the original failure is resolved.

Do not use trial-and-error edits as a substitute for diagnosis when the
cause can be reasoned about.

---

# 11. Refactoring Loop

Before a significant refactor, communicate:

### Current Structure

What exists today?

### Complexity

What makes it difficult to understand or change?

### Proposed Structure

What will change?

### Reason

Why is the new structure better?

### Preserved Behavior

What must remain unchanged?

When the `architecture-picture` skill is present and the refactor is
large or architectural, produce and open the architecture picture before
implementing.

After refactoring, explain:

* the resulting structure
* the complexity removed
* important tradeoffs
* verification performed

A refactor should have a reason beyond:

> "This code looks cleaner."

---

# 12. Architecture and Data Changes

For changes involving:

* persistence
* concurrency
* distributed systems
* significant scale
* external services
* data modeling

explicitly reason about relevant properties such as:

* data model
* access patterns
* consistency
* transactions
* concurrency
* durability
* availability
* replication
* partitioning
* caching
* asynchronous processing
* ordering
* idempotency
* failure modes
* observability

When the `architecture-picture` skill is present, produce and open the
architecture picture before implementing these changes.

Do not select infrastructure first and invent requirements afterward.

Start with system requirements.

---

# 13. Avoid Cognitive Outsourcing

The agent should help the human think, not provide an excuse not to think.

Do not optimize explanations for making the human dependent on the agent.

The human should gradually become **more** capable of reasoning about the
system, not less.

When explaining complex code, prioritize:

1. purpose
2. behavior
3. logic
4. algorithm
5. state/data flow
6. invariants
7. tradeoffs
8. failure modes

Only then discuss implementation details when necessary.

Do not overwhelm the human with irrelevant code narration.

---

# 14. Maintain a Useful Level of Detail

The feedback loop should be:

* explicit enough to preserve understanding
* concise enough to remain usable
* detailed enough to expose meaningful decisions
* adaptive to the size and risk of the change

Do not explain every trivial edit.

Do not hide significant decisions.

The rule is:

> **Explain what the human needs to understand the system, not everything
> the agent happened to do.**

---

# 15. Protect Session Context

Session quality is part of the feedback loop.

As context fills, the agent and the human both lose fidelity. Automatic
compaction near the limit is a last resort, not the preferred checkpoint.

After a medium or large unit of work, or before starting unrelated work,
choose:

```text
Restate the mental model
    ↓
Compact or summarize
    or
Start a fresh session
```

Preserve:

* goal
* current vs desired behavior
* logic and algorithm
* invariants
* important decisions and tradeoffs
* remaining work
* remaining uncertainty

Do not preserve a line-by-line history of tool output.

Do not compact in the middle of:

* an unfinished diagnosis
* an unfinished implementation
* a comparison of intended vs actual behavior that still needs the
  evidence in front of you

If the tool exposes a compact or summarize action, use it at the
checkpoint. Do not wait until the window is nearly full.

If the next work is unrelated, start a new session instead of mixing
two mental models in one transcript.

---

# 16. Completion Gate

For medium and large changes, consider the task complete only when:

* the requirement was understood
* the mental model is coherent
* the logic is explicit
* the implementation reflects the logic
* important assumptions are known
* important failure modes were considered
* appropriate verification was performed
* intended behavior was compared with actual behavior
* remaining uncertainty was communicated
* for complex / large work: the Human Understanding Check (teach-back)
  was run, or the human explicitly declined it

The final question is not:

> "Did I write the code?"

It is:

> **"Can the human engineer understand and reason about what now exists?"**

For complex work, that answer is evidenced by teach-back—not by the
agent’s explanation alone.

If not, the feedback loop has failed.

---

# Final Principle

The purpose of agentic engineering is not to remove the engineer from the
development process.

It is to remove unnecessary mechanical work while preserving—and ideally
strengthening—the engineer's ability to reason about the system.

**The agent should make the human engineer's mental model more accurate,
not make the human engineer unnecessary.**
