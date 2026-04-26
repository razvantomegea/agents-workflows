Verify each finding against the current code and only fix it if needed.

Inline comments:
In `@src/cli/init-command.ts`:
- Around line 34-39: Add a unit test to cover a non-host-os valid isolation
option (e.g., "vm") for parseNonInteractiveFlags so the validator accepts other
valid isolation choices beyond "docker"; update the test suite that currently
exercises Rule 5 to include at least one more case (call
parseNonInteractiveFlags with nonInteractive=true and isolation="vm" and assert
no error / returned flags are valid), and ensure the test also demonstrates that
acceptRisks may be false for non-host-os isolations (e.g., include a case with
acceptRisks=false) while leaving existing "docker" tests intact.

---

Outside diff comments:
In `@src/prompt/prompt-flow.ts`:
- Around line 48-50: The --yes branch returns early from the flow (when
options.yes is true) and thus skips applying the non-interactive/security flags
handled by askNonInteractiveMode; change the logic so
createDefaultConfig(detected, pkg?.scripts ?? {}, pkg) is still used but its
result is merged with the non-interactive/security flags from
askNonInteractiveMode (or call askNonInteractiveMode first to produce a flags
object and then pass/merge those flags into createDefaultConfig), ensuring
options.nonInteractive, options.isolation, and options.acceptRisks are preserved
when options.yes is set; update references around createDefaultConfig and
askNonInteractiveMode to combine their outputs instead of returning early.

---

Nitpick comments:
In @.claude/scratchpad/review-task-epic10.md:
- Around line 1-76: This file is an ephemeral gate-review scratchpad titled
"Review Task: Epic 10 Non-Interactive Mode — Final Gate" that shouldn’t be
committed long-term; remove the file from the branch (undo the commit or git rm)
and relocate its contents to a PR comment, CI artifact, or dedicated runbook,
then prevent future accidental commits by adding the appropriate ignore rule or
CI step to exclude ephemeral scratchpad files from commits.

In `@PLAN.md`:
- Line 69: Remove the stray spaces inside the backtick-enclosed code span on the
marked line so the inline code reads `src/generator/` (or `EJS render util`)
with no leading/trailing spaces; edit the markdown on that line to replace any
`` ` src/generator/ ` ``-style span with `` `src/generator/` `` and re-run the
linter to confirm MD038 is resolved.

In `@src/cli/index.ts`:
- Around line 31-37: The non-interactive option chain (the
.option('--non-interactive' ...), .addOption(new Option('--isolation <env>'
...).choices([...ISOLATION_CHOICES])), and .option('--accept-risks' ...) is
duplicated for the init and update commands; extract this into a shared helper
(e.g., addNonInteractiveOptions(command) or buildNonInteractiveOptions()) and
call it from both init and update so the same wiring, help text and validation
for --non-interactive, --isolation and --accept-risks (and the ISOLATION_CHOICES
reference) are maintained in one place.

In `@src/cli/non-interactive-flags.ts`:
- Around line 15-20: The NonInteractiveFlagsError class can break instanceof
checks when targeting ES5; in the constructor of NonInteractiveFlagsError add a
prototype fix by calling Object.setPrototypeOf(this,
NonInteractiveFlagsError.prototype) after super(message) and also ensure the
name is set (this.name = 'NonInteractiveFlagsError') so the subclassed Error has
the correct prototype chain for reliable instanceof behavior.

In `@src/cli/update-command.ts`:
- Around line 55-56: The local variable const nonInteractive = options.yes ||
options.noPrompt should be renamed (e.g., const promptsSuppressed or const
suppressPrompts) to avoid colliding with options.nonInteractive; update every
usage of that local (including the other occurrence around the later usage of
the same variable) to the new name and ensure it continues to derive from
options.yes || options.noPrompt so it clearly represents CLI prompt suppression
rather than the security-mode flag.

In `@src/prompt/default-config.ts`:
- Line 107: The assignment of SECURITY_DEFAULTS to config.security in
createDefaultConfig() should use a defensive copy so each config gets its own
object; replace the direct reference (security: SECURITY_DEFAULTS) with a copy
(e.g., shallow clone or deep clone as appropriate for SECURITY_DEFAULTS' shape)
to avoid shared-mutation risk and ensure config.security can be mutated safely
without affecting the module-level SECURITY_DEFAULTS.

In `@src/schema/stack-config.ts`:
- Line 148: The schema is using a hard-cast for SECURITY_DEFAULTS in the
.default(...) call which can mask type drift; update the SECURITY_DEFAULTS
declaration to have the correct typed shape (matching the schema type used by
the stack config) and then remove the ad-hoc cast so you pass SECURITY_DEFAULTS
directly into .default(...). Locate the DEFAULT usage in the schema definition
where .default(SECURITY_DEFAULTS as { nonInteractiveMode: false; runsIn: null;
disclosureAcknowledgedAt: null }) is set, fix the SECURITY_DEFAULTS type at its
declaration to align with the schema type, and replace the casted call with
.default(SECURITY_DEFAULTS).

In `@tests/generator/epic-10-non-interactive.test.ts`:
- Around line 59-61: The two assertions for the disclosureAcknowledgedAt
timestamp use different tolerances (one uses before - 5000, another before -
1000); make them consistent by extracting a shared tolerance constant (e.g.,
TIMESTAMP_TOLERANCE_MS) and use it in both checks that compute ts from
result.disclosureAcknowledgedAt, updating the comparisons around before and
after (references: variable ts, result.disclosureAcknowledgedAt, before, after)
so both tests use the same tolerance value for maintainability.

In `@tests/generator/epic-10-template-branching.test.ts`:
- Around line 11-17: The test defines the same nonInteractiveConfig in two
places; extract a single shared constant (e.g., const nonInteractiveConfig =
makeStackConfig({...}) with security.nonInteractiveMode: true, runsIn: 'docker',
disclosureAcknowledgedAt: '2026-04-25T12:00:00.000Z') at the top of the test
file and replace both local definitions with references to that constant so the
duplicated makeStackConfig call is removed; update both describe blocks to
import/use that shared nonInteractiveConfig variable (referencing the existing
symbol name nonInteractiveConfig and the factory function makeStackConfig).