@README.md:1-161 Fix the following issues. The issues can be from different files or can overlap on same lines in one file.

- Verify each finding against the current code and only fix it if needed.

In @.gitignore around lines 7 - 12, Remove the duplicate `.vscode/` entry from the .gitignore so it only appears once; locate the repeated `.vscode/` lines in the file (they appear in the provided diff) and delete the redundant occurrence, leaving a single `.vscode/` pattern in the list.

- Verify each finding against the current code and only fix it if needed.

In @package.json at line 63, Add a single trailing newline at the end of package.json so the file ends with a newline character (POSIX-compliant EOF); simply update the file to ensure there is a final blank line after the closing brace '}'.

- Verify each finding against the current code and only fix it if needed.

In @src/detector/detect-monorepo.ts around lines 89 - 91, The function inferNpmOrYarn currently ignores its _projectRoot parameter and always returns 'npm'; change inferNpmOrYarn(projectRoot: string) to check for a yarn.lock file under the given projectRoot (e.g., using fs.existsSync or await fs.promises.access) and return 'yarn' when present otherwise 'npm', and then update the readWorkspacePatterns call site to await the (now async) inferNpmOrYarn result so workspace detection correctly distinguishes Yarn vs npm workspaces.