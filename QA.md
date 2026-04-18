# QA Notes

## 2026-04-18 - `init --yes` on this repository

Command tested:

```powershell
node dist\index.js init --dir . --yes
```

Outcome:

- `corepack pnpm build` completed successfully before running the CLI.
- The first sandboxed CLI run failed with `EPERM` while reading `node_modules\.pnpm\ansi-styles@4.3.0\node_modules\ansi-styles\index.js`; rerunning with elevated filesystem permissions completed successfully. This appears to be a local sandbox permission issue, not necessarily an `agents-workflows` issue.
- The CLI generated 25 files and wrote `.agents-workflows.json`.

Issues found:

- [x] 1. The detected stack summary and generated config disagree.
   - Console output only reported TypeScript, Jest, Oxlint, pnpm, and README.md.
   - The generated `.agents-workflows.json` set `stack.framework` to `"react"` and generated `project.description` as `"A react application"`.
   - This repository is a TypeScript CLI package, so `--yes` appears to fall back to React defaults when no framework is detected. That produces misleading generated instructions.
   - **Fixed**: `stack.framework` is now nullable in the schema. `createDefaultConfig` no longer forces `'react'`; `project.description` falls back to `A <language> project` when no framework is detected.

- [x] 2. The generated project name falls back to `my-project`.
   - `package.json` contains `"name": "agents-workflows"`, but `.agents-workflows.json` generated `project.name` as `"my-project"`.
   - Non-interactive init should probably use the package name when available.
   - **Fixed**: Non-interactive init and interactive defaults now prefer `package.json` `name`/`description` when available.

- [x] 3. Backup logging is confusing.
   - The CLI printed `Backed up 1 existing file(s) to .agents-workflows-backup/`, which matched the single pre-existing `.claude/settings.local.json` backup.
   - Immediately after that, it printed all 25 generated file paths, making the output look like all generated files were backed up.
   - **Fixed**: `init-command` now prints `Writing files:` header before listing generated files, clearly separating the backup summary from the write list.

- [x] 4. Completion path display is awkward for `--dir .`.
   - The CLI printed `Done! 25 files generated at ..`
   - For a current-directory run, `.` or the resolved absolute path would be clearer.
   - **Fixed**: `projectRoot` is now resolved to an absolute path before display, and the trailing period inside the string was removed.
