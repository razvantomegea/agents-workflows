$ErrorActionPreference = "Stop"

$files = @(
  ".claude/settings.json",
  ".codex/rules/project.rules",
  "AGENTS.md",
  "AGENTS-DEPLOYMENT.md",
  "PLAN.md",
  "PRD.md",
  "QA.md",
  "README.md",
  "src/generator/build-context.ts",
  "src/generator/permission-constants.ts",
  "src/generator/permissions.ts",
  "src/generator/types.ts",
  "src/templates/config/codex-project-rules.ejs",
  "src/templates/config/settings.json.ejs",
  "src/templates/partials/session-hygiene.md.ejs",
  "tests/generator/codex-project-rules.test.ts",
  "tests/generator/epic-1-safety.test.ts",
  "tests/generator/epic-5-hooks.test.ts",
  "tests/generator/permissions.test.ts",
  "tests/generator/settings-json-shape.helper.ts",
  "tests/security/smoke.test.ts"
)

Write-Output "### GIT STATUS"
git status --short -- $files

Write-Output ""
Write-Output "### GIT DIFF"
git diff -- $files

foreach ($file in $files) {
  if (Test-Path $file) {
    Write-Output ""
    Write-Output ("### FILE: " + $file)
    $lineNo = 0
    Get-Content $file | ForEach-Object {
      $lineNo++
      ("{0,5}: {1}" -f $lineNo, $_)
    }
  }
}
