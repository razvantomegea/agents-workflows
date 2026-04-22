param(
  [switch]$CopySkills
)

$ErrorActionPreference = 'Stop'

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptPath '..\..')).Path
$codexRoot = Join-Path $repoRoot '.codex'
$projectSkills = Join-Path $codexRoot 'skills'
$projectPrompts = Join-Path $codexRoot 'prompts'
$agentsRoot = Join-Path $repoRoot '.agents'
$agentsSkills = Join-Path $agentsRoot 'skills'
$userPrompts = Join-Path $HOME '.codex\prompts'

function Clear-GeneratedSkillsDirectory {
  param([string]$Path)

  $resolvedAgentsRoot = (Resolve-Path -LiteralPath $agentsRoot).Path
  $resolvedPath = (Resolve-Path -LiteralPath $Path).Path

  if (-not $resolvedPath.StartsWith($resolvedAgentsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove path outside generated .agents directory: $resolvedPath"
  }

  Remove-Item -LiteralPath $resolvedPath -Recurse -Force
}

if (-not (Test-Path -LiteralPath $projectSkills)) {
  throw "Missing project skills directory: $projectSkills"
}

if (-not (Test-Path -LiteralPath $projectPrompts)) {
  throw "Missing project prompts directory: $projectPrompts"
}

$missingSkills = Get-ChildItem -Path $projectSkills -Directory |
  Where-Object { -not (Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md')) }

if ($missingSkills) {
  $names = ($missingSkills | ForEach-Object { $_.Name }) -join ', '
  throw "Skill directories missing SKILL.md: $names"
}

New-Item -ItemType Directory -Force -Path $userPrompts | Out-Null
$promptFiles = Get-ChildItem -Path $projectPrompts -Filter '*.md' -File
if ($promptFiles.Count -gt 0) {
  Copy-Item -Path $promptFiles.FullName -Destination $userPrompts -Force
}

New-Item -ItemType Directory -Force -Path $agentsRoot | Out-Null

if (Test-Path -LiteralPath $agentsSkills) {
  $existing = Get-Item -LiteralPath $agentsSkills
  if ($existing.LinkType -eq 'Junction' -or $existing.LinkType -eq 'SymbolicLink') {
    $target = @($existing.Target)[0]
    $resolvedTarget = if ([System.IO.Path]::IsPathRooted($target)) {
      [System.IO.Path]::GetFullPath($target)
    } else {
      [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $agentsSkills) $target))
    }
    $resolvedProjectSkills = (Resolve-Path -LiteralPath $projectSkills).Path
    if (-not $resolvedTarget.Equals($resolvedProjectSkills, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Existing .agents\skills points to '$target', expected '$resolvedProjectSkills'."
    }
  } elseif ($CopySkills) {
    Clear-GeneratedSkillsDirectory -Path $agentsSkills
    New-Item -ItemType Directory -Force -Path $agentsSkills | Out-Null
    Copy-Item -Path (Join-Path $projectSkills '*') -Destination $agentsSkills -Recurse -Force
  } else {
    Write-Host ".agents\skills already exists as a real directory; leaving it untouched."
    Write-Host "Run with -CopySkills to replace it with a fresh copy from .codex\skills."
  }
} elseif ($CopySkills) {
  New-Item -ItemType Directory -Force -Path $agentsSkills | Out-Null
  Copy-Item -Path (Join-Path $projectSkills '*') -Destination $agentsSkills -Recurse -Force
} else {
  try {
    New-Item -ItemType Junction -Path $agentsSkills -Target $projectSkills | Out-Null
  } catch {
    Write-Host "Could not create a junction; falling back to a copied .agents\skills tree."
    New-Item -ItemType Directory -Force -Path $agentsSkills | Out-Null
    Copy-Item -Path (Join-Path $projectSkills '*') -Destination $agentsSkills -Recurse -Force
  }
}

$promptCount = (Get-ChildItem -Path $projectPrompts -Filter '*.md' -File).Count
$skillCount = (Get-ChildItem -Path $projectSkills -Directory).Count

Write-Host "Synced $promptCount Codex prompt(s) to $userPrompts."
Write-Host "Wired $skillCount Codex skill(s) through $agentsSkills."
Write-Host "Do not map SKILL.md files through agents.*.config_file; Codex discovers them via .agents\skills."
